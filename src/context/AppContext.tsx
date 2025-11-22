'use client';

import React, { createContext, useContext, useState, useRef, ReactNode, useEffect } from 'react';
import { storage, db } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, getDocs, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { useUser } from "@stackframe/stack";

export interface ChatMessage {
    id: string;
    role: 'user' | 'ai';
    content: string;
    timestamp: Date;
}

export interface SavedChat {
    id: string;
    title: string;
    date: string;
    messages: ChatMessage[];
}

export interface FeedItem {
    id: string; // Changed to string for Firestore ID
    userId: string;
    user: string;
    avatar: string;
    prompt: string;
    likes: number;
    image: string;
    createdAt?: any;
}

interface AppContextType {
    inputPrompt: string;
    setInputPrompt: (prompt: string) => void;
    chatHistory: ChatMessage[];
    setChatHistory: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
    addMessage: (role: 'user' | 'ai', content: string) => void;
    isLeftSidebarOpen: boolean;
    toggleLeftSidebar: () => void;
    isRightSidebarOpen: boolean;
    toggleRightSidebar: () => void;
    isUploadModalOpen: boolean;
    toggleUploadModal: () => void;
    clearHistory: () => void;
    savedChats: SavedChat[];
    startNewChat: () => void;
    loadChat: (chatId: string) => void;
    deleteChat: (chatId: string) => void;
    communityFeed: FeedItem[];
    addToFeed: (item: Omit<FeedItem, 'id' | 'userId' | 'userAvatar' | 'userName' | 'createdAt' | 'likes'>, file?: File) => Promise<void>;
    deleteFeedItem: (id: string) => Promise<void>;
    likeFeedItem: (id: string) => Promise<void>;
    uploadImage: (file: File) => Promise<string>;
    userAvatar: string;
    setUserAvatar: (avatar: string) => void;
    isGeneratingImage: boolean;
    generateImage: (prompt: string, model?: string, image?: string) => Promise<string | null>;
    currentChatId: string;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
    const [inputPrompt, setInputPrompt] = useState('');
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
    const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(false);
    const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(false);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [savedChats, setSavedChats] = useState<SavedChat[]>([]);
    const [communityFeed, setCommunityFeed] = useState<FeedItem[]>([]);
    const [userAvatar, setUserAvatar] = useState('https://i.pravatar.cc/150?img=68');
    const [currentChatId, setCurrentChatId] = useState<string>(`chat-${Date.now()}`);
    const [isGeneratingImage, setIsGeneratingImage] = useState(false);

    // Refs for optimization
    const user = useUser();

    // Fetch community feed from Firestore on mount
    useEffect(() => {
        const fetchFeed = async () => {
            try {
                const q = query(collection(db, "communityFeed"), orderBy("createdAt", "desc"));
                const querySnapshot = await getDocs(q);
                const feedData: FeedItem[] = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    userId: doc.data().userId || 'anonymous',
                    user: doc.data().userName || 'Anonymous',
                    avatar: doc.data().userAvatar || 'https://i.pravatar.cc/150?img=68',
                    prompt: doc.data().prompt || '',
                    likes: doc.data().likes || 0,
                    image: doc.data().imageUrl,
                    createdAt: doc.data().createdAt
                }));
                setCommunityFeed(feedData);
            } catch (error) {
                console.error("Failed to fetch community feed:", error);
            }
        };

        fetchFeed();
    }, []);

    const uploadImage = async (file: File): Promise<string> => {
        try {
            const formData = new FormData();
            formData.append('file', file);

            const res = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });

            if (!res.ok) {
                const errorData = await res.json();
                const errorMessage = errorData.details
                    ? `${errorData.error}: ${errorData.details}`
                    : (errorData.error || 'Upload failed');
                throw new Error(errorMessage);
            }

            const data = await res.json();
            return data.url;
        } catch (error) {
            console.error('Error uploading image:', error);
            throw error;
        }
    };

    const toggleLeftSidebar = () => {
        setIsLeftSidebarOpen(prev => {
            if (!prev) setIsRightSidebarOpen(false);
            return !prev;
        });
    };

    const toggleRightSidebar = () => {
        setIsRightSidebarOpen(prev => {
            if (!prev) setIsLeftSidebarOpen(false);
            return !prev;
        });
    };

    const toggleUploadModal = () => setIsUploadModalOpen(!isUploadModalOpen);

    const addToFeed = async (item: Omit<FeedItem, 'id' | 'userId' | 'userAvatar' | 'userName' | 'createdAt' | 'likes'>, file?: File) => {
        // Create a temporary ID for optimistic update
        const tempId = String(Date.now());
        const newItem: FeedItem = {
            ...item,
            id: tempId,
            userId: user?.id || 'anonymous',
            user: user?.displayName || 'Anonymous',
            avatar: user?.profileImageUrl || 'https://i.pravatar.cc/150?img=68',
            likes: 0,
            createdAt: new Date()
        };

        // Optimistic update
        setCommunityFeed((prev) => [newItem, ...prev]);

        try {
            let imageUrl = item.image;

            if (file) {
                console.log('[addToFeed] Uploading image to Cloudinary...');
                imageUrl = await uploadImage(file);
                console.log('[addToFeed] Image uploaded:', imageUrl);
            } else if (item.image.startsWith('data:image')) {
                console.log('[addToFeed] Uploading base64 image to Cloudinary...');
                const blob = await (await fetch(item.image)).blob();
                const imageFile = new File([blob], `feed-${Date.now()}.jpg`, { type: 'image/jpeg' });
                imageUrl = await uploadImage(imageFile);
                console.log('[addToFeed] Base64 image uploaded:', imageUrl);
            }

            // Save to Firestore
            console.log('[addToFeed] Saving to Firestore...');
            const docRef = await addDoc(collection(db, "communityFeed"), {
                userId: user?.id || 'anonymous',
                userAvatar: user?.profileImageUrl || 'https://i.pravatar.cc/150?img=68',
                userName: user?.displayName || 'Anonymous',
                imageUrl,
                prompt: item.prompt,
                likes: 0,
                createdAt: serverTimestamp()
            });

            console.log('[addToFeed] Firestore Success, ID:', docRef.id);

            // Update the locally added item with the real ID and URL
            setCommunityFeed((prev) =>
                prev.map((i) =>
                    i.id === tempId ? { ...i, id: docRef.id, imageUrl: imageUrl } : i
                )
            );

        } catch (error) {
            console.error("Failed to add to feed:", error);
            // Rollback optimistic update
            setCommunityFeed((prev) => prev.filter((i) => i.id !== tempId));
            alert("Failed to upload to community feed. Please try again.");
        }
    };

    const deleteFeedItem = async (id: string) => {
        // Optimistic update
        setCommunityFeed(prev => prev.filter(item => item.id !== id));
        try {
            await fetch(`/api/feed/${id}`, { method: 'DELETE' });
        } catch (error) {
            console.error("Failed to delete feed item:", error);
            // Revert on failure (would need to re-fetch or keep item in memory to revert properly, 
            // but for now we just log error. In a real app we'd handle rollback better)
        }
    };

    const likeFeedItem = async (id: string) => {
        // Optimistic update
        setCommunityFeed(prev => prev.map(item =>
            item.id === id ? { ...item, likes: item.likes + 1 } : item
        ));

        try {
            await fetch(`/api/feed/${id}/like`, { method: 'POST' });
        } catch (error) {
            console.error("Failed to like feed item:", error);
            // Revert
            setCommunityFeed(prev => prev.map(item =>
                item.id === id ? { ...item, likes: item.likes - 1 } : item
            ));
        }
    };

    const messageIdCounter = useRef(0);

    // Load sidebar states from localStorage on mount (keep UI preferences local)
    useEffect(() => {
        const storedLeft = localStorage.getItem('isLeftSidebarOpen');
        const storedRight = localStorage.getItem('isRightSidebarOpen');

        if (storedLeft !== null) setIsLeftSidebarOpen(storedLeft === 'true');
        if (storedRight !== null) setIsRightSidebarOpen(storedRight === 'true');
    }, []);

    // Save sidebar states to localStorage when they change
    useEffect(() => {
        try {
            localStorage.setItem('isLeftSidebarOpen', String(isLeftSidebarOpen));
        } catch (e) {
            console.warn('[LocalStorage] Failed to save left sidebar state:', e);
        }
    }, [isLeftSidebarOpen]);

    useEffect(() => {
        try {
            localStorage.setItem('isRightSidebarOpen', String(isRightSidebarOpen));
        } catch (e) {
            console.warn('[LocalStorage] Failed to save right sidebar state:', e);
        }
    }, [isRightSidebarOpen]);

    // Load chat history from DB on mount or when user changes
    useEffect(() => {
        const fetchHistory = async () => {
            if (!user) {
                setChatHistory([]);
                setSavedChats([]);
                return;
            }

            // Ideally we should know which chat ID to load. 
            // For now, let's load the most recent chat or a default one.
            // Or we can just start empty and let the user select a chat.
            // But the user expects "robust AI memory".
            // Let's try to load the last active chat.
            try {
                const res = await fetch('/api/chats');
                const data = await res.json();
                if (data.success) {
                    const loadedChats = data.chats.map((c: any) => ({
                        id: c.id,
                        title: c.title,
                        date: new Date(c.createdAt).toLocaleDateString(),
                        messages: [] // Messages are loaded on demand
                    }));

                    // Deduplicate chats by ID to prevent React key errors
                    const uniqueChats = Array.from(new Map(loadedChats.map((c: any) => [c.id, c])).values()) as SavedChat[];
                    setSavedChats(uniqueChats);

                    if (uniqueChats.length > 0) {
                        // Load the most recent chat
                        loadChat(uniqueChats[0].id);
                    } else {
                        // No chats, start a new one and ensure it's in the list
                        startNewChat();
                    }
                } else {
                    setChatHistory([]);
                    startNewChat();
                }
            } catch (error) {
                console.error("Failed to load initial chat history:", error);
                setChatHistory([]);
                startNewChat();
            }
        };

        fetchHistory();
    }, [user]);

    const addMessage = (role: 'user' | 'ai', content: string) => {
        messageIdCounter.current += 1;
        const newMessage: ChatMessage = {
            id: `msg-${messageIdCounter.current}`,
            role,
            content,
            timestamp: new Date(),
        };
        setChatHistory((prev) => [...prev, newMessage]);
    };

    const startNewChat = async () => {
        if (chatHistory.length > 0) {
            // Save current chat if it has messages and we haven't reached the limit
            if (savedChats.length < 6) {
                const lastUserMsg = [...chatHistory].reverse().find(msg => msg.role === 'user');
                const titleText = lastUserMsg ? lastUserMsg.content : chatHistory[0].content;
                // Use the currentChatId for saving
                const chatId = currentChatId;

                const newSavedChat: SavedChat = {
                    id: chatId,
                    title: titleText.slice(0, 30) + (titleText.length > 30 ? '...' : ''),
                    date: new Date().toLocaleDateString(),
                    messages: [...chatHistory]
                };

                // Optimistic update: Remove existing if present, then add to top
                setSavedChats(prev => {
                    const filtered = prev.filter(c => c.id !== chatId);
                    return [newSavedChat, ...filtered];
                });

                // Persist to DB
                try {
                    await fetch('/api/chats', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(newSavedChat),
                    });
                } catch (error) {
                    console.error("Failed to save chat:", error);
                }
            }
        } else {
            // If current chat was empty, remove it from savedChats list if it's there (cleanup placeholder)
            setSavedChats(prev => prev.filter(c => c.id !== currentChatId));
        }

        setChatHistory([]);
        setInputPrompt('');
        // Generate a new ID for the new session
        const newId = `chat-${Date.now()}`;
        setCurrentChatId(newId);

        // Add new empty chat to savedChats so it appears in sidebar immediately
        const newChatSession: SavedChat = {
            id: newId,
            title: 'New Chat',
            date: new Date().toLocaleDateString(),
            messages: []
        };
        setSavedChats(prev => [newChatSession, ...prev]);
    };

    const loadChat = async (id: string) => {
        try {
            setCurrentChatId(id); // Set the active chat ID
            const res = await fetch(`/api/chats/${id}`);
            const data = await res.json();
            if (data.success) {
                const messages = data.messages.map((m: { id: string; role: 'user' | 'ai'; content: string; createdAt: string }) => ({
                    id: String(m.id),
                    role: m.role,
                    content: m.content,
                    timestamp: new Date(m.createdAt)
                }));
                setChatHistory(messages);
            }
        } catch (error) {
            console.error("Failed to load chat:", error);
        }
    };

    const deleteChat = async (id: string) => {
        // Optimistic update
        setSavedChats(prev => prev.filter(c => c.id !== id));
        try {
            await fetch(`/api/chats/${id}`, { method: 'DELETE' });
        } catch (error) {
            console.error("Failed to delete chat:", error);
        }
    };

    const clearHistory = async () => {
        // If the current chat is saved, delete it from the backend
        if (savedChats.some(c => c.id === currentChatId)) {
            try {
                await fetch(`/api/chats/${currentChatId}`, { method: 'DELETE' });
                // Remove from savedChats
                setSavedChats(prev => prev.filter(c => c.id !== currentChatId));
            } catch (error) {
                console.error("Failed to delete chat history:", error);
            }
        }

        setChatHistory([]);
        // Start a fresh session ID to ensure context is cleared on backend too
        const newId = `chat-${Date.now()}`;
        setCurrentChatId(newId);

        // Add new empty chat to savedChats so it appears in sidebar immediately
        const newChatSession: SavedChat = {
            id: newId,
            title: 'New Chat',
            date: new Date().toLocaleDateString(),
            messages: []
        };
        setSavedChats(prev => [newChatSession, ...prev]);
    };

    const generateImage = async (prompt: string, model: string = 'flux', image?: string): Promise<string | null> => {
        setIsGeneratingImage(true);
        try {
            const res = await fetch('/api/generate-image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt, model, image }),
            });

            console.log('[Generate Image] Response status:', res.status);
            const text = await res.text();
            console.log('[Generate Image] Raw response:', text.slice(0, 200)); // Log first 200 chars

            let data;
            try {
                data = JSON.parse(text);
            } catch (e) {
                console.error('[Generate Image] Failed to parse JSON:', e);
                throw new Error(`Server returned ${res.status} ${res.statusText}. Check console for raw response.`);
            }

            if (data.success && data.data?.image) {
                // Convert the URL to base64 to store locally
                try {
                    const imageRes = await fetch(data.data.image.url);
                    const blob = await imageRes.blob();
                    return await new Promise((resolve) => {
                        const reader = new FileReader();
                        reader.onloadend = () => resolve(reader.result as string);
                        reader.readAsDataURL(blob);
                    });
                } catch (e) {
                    console.error("Failed to convert generated image to base64:", e);
                    // Fallback to URL if conversion fails (though it might not persist well if URL expires)
                    return data.data.image.url;
                }
            } else {
                console.error('Image generation failed:', data.error, data.details);
                // Throw error with details if available
                const errorMessage = data.details ? `${data.error}: ${data.details}` : (data.error || 'Image generation failed');
                throw new Error(errorMessage);
            }
        } catch (error) {
            console.error('Image generation error:', error);
            return null;
        } finally {
            setIsGeneratingImage(false);
        }
    };

    return (
        <AppContext.Provider value={{
            inputPrompt,
            setInputPrompt,
            chatHistory,
            setChatHistory,
            addMessage,
            clearHistory,
            isLeftSidebarOpen,
            isRightSidebarOpen,
            toggleLeftSidebar,
            toggleRightSidebar,
            userAvatar,
            setUserAvatar,
            currentChatId,
            isGeneratingImage,
            generateImage,
            savedChats,
            startNewChat,
            loadChat,
            deleteChat,
            addToFeed,
            deleteFeedItem,
            likeFeedItem,
            uploadImage,
            communityFeed,
            isUploadModalOpen,
            toggleUploadModal
        }}>
            {children}
        </AppContext.Provider>
    );
}

export function useApp() {
    const context = useContext(AppContext);
    if (context === undefined) {
        throw new Error('useApp must be used within an AppProvider');
    }
    return context;
}
