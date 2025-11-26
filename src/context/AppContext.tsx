'use client';

import React, { createContext, useContext, useState, useRef, ReactNode, useEffect } from 'react';
import { storage, db } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, getDocs, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { useUser } from "@stackframe/stack";
import { toast } from 'sonner';
import imageCompression from 'browser-image-compression';

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
    likedBy: string[]; // Array of user IDs who liked the post
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
    addToFeed: (item: Omit<FeedItem, 'id' | 'userId' | 'userAvatar' | 'userName' | 'createdAt' | 'likes' | 'likedBy'>, file?: File) => Promise<void>;
    deleteFeedItem: (id: string) => Promise<void>;
    likeFeedItem: (id: string) => Promise<void>;
    uploadImage: (file: File) => Promise<string>;
    userAvatar: string;
    setUserAvatar: (avatar: string) => void;
    isGeneratingImage: boolean;
    generateImage: (prompt: string, model?: string, image?: string) => Promise<string | null>;
    isGeneratingVideo: boolean;
    generateVideo: (prompt: string, model?: string) => Promise<string | null>;
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
    const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);

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
                    likedBy: doc.data().likedBy || [],
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
            // 1. Compress Image
            const options = {
                maxSizeMB: 0.8,
                maxWidthOrHeight: 1600,
                useWebWorker: true,
            };

            let compressedFile = file;
            try {
                compressedFile = await imageCompression(file, options);
            } catch (error) {
                console.warn("Image compression failed, proceeding with original file:", error);
            }

            // 2. Upload via Server API (which handles Cloudinary + DB persistence)
            const formData = new FormData();
            formData.append('file', compressedFile);

            const res = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || 'Upload failed');
            }

            const data = await res.json();
            return data.url;
        } catch (error: any) {
            console.error("Upload failed:", error);
            throw new Error(error.message || 'Upload failed');
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

    const addToFeed = async (item: Omit<FeedItem, 'id' | 'userId' | 'userAvatar' | 'userName' | 'createdAt' | 'likes' | 'likedBy'>, file?: File) => {
        // Create a temporary ID for optimistic update
        const tempId = String(Date.now());
        const newItem: FeedItem = {
            ...item,
            id: tempId,
            userId: user?.id || 'anonymous',
            user: user?.displayName || 'Anonymous',
            avatar: user?.profileImageUrl || 'https://i.pravatar.cc/150?img=68',
            likes: 0,
            likedBy: [],
            image: item.image,
            createdAt: new Date()
        };

        // Optimistic update
        setCommunityFeed((prev) => [newItem, ...prev]);

        const uploadPromise = async () => {
            let imageUrl = item.image;

            if (file) {
                imageUrl = await uploadImage(file);
            } else if (item.image.startsWith('data:image')) {
                const blob = await (await fetch(item.image)).blob();
                const imageFile = new File([blob], `feed-${Date.now()}.jpg`, { type: 'image/jpeg' });
                imageUrl = await uploadImage(imageFile);
            }

            // Save to Firestore
            const docRef = await addDoc(collection(db, "communityFeed"), {
                userId: user?.id || 'anonymous',
                userAvatar: user?.profileImageUrl || 'https://i.pravatar.cc/150?img=68',
                userName: user?.displayName || 'Anonymous',
                imageUrl,
                prompt: item.prompt,
                likes: 0,
                likedBy: [],
                createdAt: serverTimestamp()
            });

            // Update the locally added item with the real ID and URL
            setCommunityFeed((prev) =>
                prev.map((i) =>
                    i.id === tempId ? { ...i, id: docRef.id, imageUrl: imageUrl } : i
                )
            );
            return "Posted to community!";
        };

        toast.promise(uploadPromise(), {
            loading: 'Sharing to community...',
            success: (data) => data,
            error: (err) => {
                // Rollback optimistic update
                setCommunityFeed((prev) => prev.filter((i) => i.id !== tempId));
                return `Failed to post: ${err.message}`;
            }
        });
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
        if (!user) {
            toast.error("Please sign in to like posts");
            return;
        }

        const userId = user.id;
        const item = communityFeed.find(i => i.id === id);
        if (!item) return;

        const hasLiked = item.likedBy.includes(userId);

        // Optimistic update
        setCommunityFeed(prev => prev.map(item => {
            if (item.id === id) {
                return {
                    ...item,
                    likes: hasLiked ? item.likes - 1 : item.likes + 1,
                    likedBy: hasLiked
                        ? item.likedBy.filter(uid => uid !== userId)
                        : [...item.likedBy, userId]
                };
            }
            return item;
        }));

        try {
            await fetch(`/api/feed/${id}/like`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId })
            });
        } catch (error) {
            console.error("Failed to like feed item:", error);
            // Revert
            setCommunityFeed(prev => prev.map(item => {
                if (item.id === id) {
                    return {
                        ...item,
                        likes: hasLiked ? item.likes + 1 : item.likes - 1,
                        likedBy: hasLiked
                            ? [...item.likedBy, userId]
                            : item.likedBy.filter(uid => uid !== userId)
                    };
                }
                return item;
            }));
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

            if (res.status === 404) {
                console.warn(`Chat ${id} not found, removing from list.`);
                setSavedChats(prev => prev.filter(c => c.id !== id));
                if (savedChats.length <= 1) {
                    startNewChat();
                }
                return;
            }

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
        const chatIdToDelete = currentChatId;

        // 1. Immediate UI updates
        setChatHistory([]);

        // Start a fresh session ID
        const newId = `chat-${Date.now()}`;
        setCurrentChatId(newId);

        // Optimistically update savedChats: remove the deleted chat (if saved) and add the new empty one
        setSavedChats(prev => {
            const filtered = prev.filter(c => c.id !== chatIdToDelete);
            const newChatSession: SavedChat = {
                id: newId,
                title: 'New Chat',
                date: new Date().toLocaleDateString(),
                messages: []
            };
            return [newChatSession, ...filtered];
        });

        // 2. Background API call to delete the chat if it was saved
        // We check the *current* savedChats state (captured in closure) or just rely on the ID check
        if (savedChats.some(c => c.id === chatIdToDelete)) {
            try {
                await fetch(`/api/chats/${chatIdToDelete}`, { method: 'DELETE' });
            } catch (error) {
                console.error("Failed to delete chat history:", error);
            }
        }
    };

    const generateImage = async (prompt: string, model: string = 'flux', image?: string): Promise<string | null> => {
        setIsGeneratingImage(true);
        try {
            const res = await fetch('/api/generate-image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt, model, image }),
            });

            const text = await res.text();

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

    const generateVideo = async (prompt: string, model: string = 'kling-std'): Promise<string | null> => {
        setIsGeneratingVideo(true);
        try {
            const res = await fetch('/api/generate-video', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt, model }),
            });

            const text = await res.text();
            let data;
            try {
                data = JSON.parse(text);
            } catch (e) {
                console.error('[Generate Video] Failed to parse JSON:', e);
                throw new Error(`Server returned ${res.status} ${res.statusText}`);
            }

            if (data.success && data.data?.video) {
                return data.data.video.url;
            } else {
                console.warn('Video generation failed:', data.error);
                throw new Error(data.error || 'Video generation failed');
            }
        } catch (error) {
            console.error('Video generation error:', error);
            return null;
        } finally {
            setIsGeneratingVideo(false);
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
            isGeneratingVideo,
            generateVideo,
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
