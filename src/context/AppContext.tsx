'use client';

import React, { createContext, useContext, useState, useRef, ReactNode, useEffect } from 'react';

interface ChatMessage {
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
    id: number;
    user: string;
    avatar: string;
    prompt: string;
    likes: string;
    image: string;
}

interface AppContextType {
    inputPrompt: string;
    setInputPrompt: (prompt: string) => void;
    chatHistory: ChatMessage[];
    addMessage: (role: 'user' | 'ai', content: string) => void;
    clearHistory: () => void;
    isLeftSidebarOpen: boolean;
    isRightSidebarOpen: boolean;
    toggleLeftSidebar: () => void;
    toggleRightSidebar: () => void;
    userAvatar: string;
    setUserAvatar: (avatar: string) => void;
    isGeneratingImage: boolean;
    generateImage: (prompt: string, model?: string, image?: string) => Promise<string | null>;
    savedChats: SavedChat[];
    startNewChat: () => void;
    loadChat: (id: string) => void;
    deleteChat: (id: string) => void;
    communityFeed: FeedItem[];
    addToFeed: (item: FeedItem) => void;
    isUploadModalOpen: boolean;
    toggleUploadModal: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
    const [inputPrompt, setInputPrompt] = useState('');
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
    const [savedChats, setSavedChats] = useState<SavedChat[]>([]);
    const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(false);
    const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(false);
    const [userAvatar, setUserAvatar] = useState('https://i.pravatar.cc/150?img=68');
    const [isGeneratingImage, setIsGeneratingImage] = useState(false);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

    const [communityFeed, setCommunityFeed] = useState<FeedItem[]>([]);

    const addToFeed = (item: FeedItem) => {
        setCommunityFeed(prev => [item, ...prev]);
    };

    const toggleUploadModal = () => {
        setIsUploadModalOpen(prev => !prev);
    };

    const messageIdCounter = useRef(0);

    // Load sidebar states and chat history from localStorage on mount
    useEffect(() => {
        const storedLeft = localStorage.getItem('isLeftSidebarOpen');
        const storedRight = localStorage.getItem('isRightSidebarOpen');
        const storedChat = localStorage.getItem('chatHistory');

        if (storedLeft !== null) setIsLeftSidebarOpen(storedLeft === 'true');
        if (storedRight !== null) setIsRightSidebarOpen(storedRight === 'true');

        // Load persisted chat history with images
        if (storedChat) {
            try {
                const parsed = JSON.parse(storedChat);
                // Convert timestamp strings back to Date objects
                const messagesWithDates = parsed.map((msg: ChatMessage & { timestamp: string }) => ({
                    ...msg,
                    timestamp: new Date(msg.timestamp)
                }));
                setChatHistory(messagesWithDates);
                console.log('[LocalStorage] Loaded chat history with', messagesWithDates.length, 'messages');
            } catch (e) {
                console.error('[LocalStorage] Failed to parse chat history:', e);
            }
        }
    }, []);

    // Load saved chats from API
    const fetchSavedChats = async () => {
        try {
            const res = await fetch('/api/chats');
            const data = await res.json();
            if (data.success) {
                const mappedChats = data.chats.map((c: { id: string; title: string; createdAt: string }) => ({
                    id: c.id,
                    title: c.title,
                    date: new Date(c.createdAt).toLocaleDateString(),
                    messages: []
                }));
                setSavedChats(mappedChats);
            }
        } catch (error) {
            console.error("Failed to fetch saved chats:", error);
        }
    };

    useEffect(() => {
        fetchSavedChats();
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

    // Save chat history to localStorage whenever it changes
    useEffect(() => {
        if (chatHistory.length > 0) {
            try {
                localStorage.setItem('chatHistory', JSON.stringify(chatHistory));
                console.log('[LocalStorage] Saved', chatHistory.length, 'messages');
            } catch (e: unknown) {
                // Use console.warn to avoid triggering Next.js error overlay in dev mode
                console.warn('[LocalStorage] Failed to save chat history:', e);

                const err = e as { name?: string; code?: number };
                if (err?.name === 'QuotaExceededError' || err?.code === 22 || err?.code === 1014) {
                    console.warn('[LocalStorage] Quota exceeded! Trying to save without images...');
                    // Fallback: Save messages but strip out base64 images to save space
                    const textOnlyHistory = chatHistory.map(msg => ({
                        ...msg,
                        content: msg.content.replace(/!\[.*?\]\(data:image\/.*?;base64,.*?\)/g, '[Image too large to save locally]')
                    }));
                    try {
                        localStorage.setItem('chatHistory', JSON.stringify(textOnlyHistory));
                        console.log('[LocalStorage] Saved text-only history due to quota limits.');
                    } catch (retryError) {
                        console.warn('[LocalStorage] Failed to save even text-only history:', retryError);
                        // Ultimate fallback: Try saving just the last 20 text-only messages
                        try {
                            const truncatedHistory = textOnlyHistory.slice(-20);
                            localStorage.setItem('chatHistory', JSON.stringify(truncatedHistory));
                            console.log('[LocalStorage] Saved truncated text-only history.');
                        } catch (finalError) {
                            console.warn('[LocalStorage] Could not save any history.', finalError);
                        }
                    }
                }
            }
        } else {
            // Clear localStorage when chat is empty
            localStorage.removeItem('chatHistory');
        }
    }, [chatHistory]);

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
                const chatId = `chat-${Date.now()}`;

                const newSavedChat: SavedChat = {
                    id: chatId,
                    title: titleText.slice(0, 30) + (titleText.length > 30 ? '...' : ''),
                    date: new Date().toLocaleDateString(),
                    messages: [...chatHistory]
                };

                // Optimistic update
                setSavedChats(prev => [newSavedChat, ...prev]);

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
        }
        setChatHistory([]);
        setInputPrompt('');
    };

    const loadChat = async (id: string) => {
        try {
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
        setChatHistory([]);
        localStorage.removeItem('chatHistory');
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

    return (
        <AppContext.Provider value={{
            inputPrompt,
            setInputPrompt,
            chatHistory,
            addMessage,
            clearHistory,
            isLeftSidebarOpen,
            isRightSidebarOpen,
            toggleLeftSidebar,
            toggleRightSidebar,
            userAvatar,
            setUserAvatar,
            isGeneratingImage,
            generateImage,
            savedChats,
            startNewChat,
            loadChat,
            deleteChat,
            communityFeed,
            addToFeed,
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
