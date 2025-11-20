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
    generateImage: (prompt: string, model?: string) => Promise<string | null>;
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

    // Load sidebar states from localStorage on mount
    useEffect(() => {
        const storedLeft = localStorage.getItem('isLeftSidebarOpen');
        const storedRight = localStorage.getItem('isRightSidebarOpen');

        if (storedLeft !== null) setIsLeftSidebarOpen(storedLeft === 'true');
        if (storedRight !== null) setIsRightSidebarOpen(storedRight === 'true');
    }, []);

    // Load saved chats from API
    // Load saved chats from API
    const fetchSavedChats = async () => {
        try {
            const res = await fetch('/api/chats');
            const data = await res.json();
            if (data.success) {
                const mappedChats = data.chats.map((c: any) => ({
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
        localStorage.setItem('isLeftSidebarOpen', String(isLeftSidebarOpen));
    }, [isLeftSidebarOpen]);

    useEffect(() => {
        localStorage.setItem('isRightSidebarOpen', String(isRightSidebarOpen));
    }, [isRightSidebarOpen]);

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
                const messages = data.messages.map((m: any) => ({
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

    const clearHistory = () => {
        setChatHistory([]);
    };

    const generateImage = async (prompt: string, model: string = 'flux'): Promise<string | null> => {
        setIsGeneratingImage(true);
        try {
            const res = await fetch('/api/generate-image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt, model }),
            });

            const data = await res.json();

            if (data.success && data.data?.image) {
                return data.data.image.url;
            } else {
                console.error('Image generation failed:', data.error);
                return null;
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
