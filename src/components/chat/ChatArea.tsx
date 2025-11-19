'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Send, Paperclip, Mic, Image as ImageIcon, Sparkles, User, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '@/context/AppContext';
import GeminiLogo3D from '../ui/GeminiLogo3D';
import Toggle3D from '../ui/Toggle3D';
import ImageGenerationSkeleton from '../ui/ImageGenerationSkeleton';
import { useUser } from "@stackframe/stack";

const ImageMessage = ({ imageUrl, onDownload }: { imageUrl: string, onDownload: (url: string) => void }) => {
    const [isLoaded, setIsLoaded] = useState(false);

    return (
        <div className="mb-3 mt-1 relative group inline-block rounded-xl overflow-hidden">
            <img
                src={imageUrl}
                alt="Generated"
                className={`max-w-full rounded-xl shadow-lg border border-white/10 transition-opacity duration-500 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
                loading="lazy"
                onLoad={() => setIsLoaded(true)}
            />
            {isLoaded && (
                <button
                    onClick={() => onDownload(imageUrl)}
                    className="absolute bottom-2 right-2 p-2 bg-black/60 hover:bg-black/80 text-white rounded-full backdrop-blur-sm transition-all border border-white/20 shadow-lg"
                    title="Download Image"
                >
                    <Download size={20} />
                </button>
            )}
        </div>
    );
};

export default function ChatArea() {
    const { inputPrompt, setInputPrompt, chatHistory, addMessage, toggleLeftSidebar, toggleRightSidebar, isLeftSidebarOpen, isRightSidebarOpen, generateImage, isGeneratingImage, userAvatar } = useApp();
    const user = useUser();
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [chatHistory, isLoading]);

    const handleSend = async () => {
        if (!inputPrompt.trim() || isLoading) return;

        const prompt = inputPrompt.trim();
        setInputPrompt(''); // Clear input immediately

        // Check if it's an image generation command
        if (prompt.toLowerCase().startsWith('@image ')) {
            const imageDescription = prompt.slice(7).trim(); // Remove '@image ' prefix

            if (!imageDescription) {
                addMessage('ai', 'Please provide a description for the image after @image');
                return;
            }

            addMessage('user', prompt);
            // Add loading message with animation
            // Loading state is handled by isGeneratingImage and the skeleton component

            try {
                const imageUrl = await generateImage(imageDescription);
                if (imageUrl) {
                    addMessage('ai', `![Generated Image](${imageUrl})`);
                } else {
                    addMessage('ai', '❌ Image generation failed. This could be due to:\n• Invalid or missing API key\n• API endpoint issues\n• Network problems\n\nPlease check the browser console for more details.');
                }
            } catch (error) {
                console.error('Image generation error:', error);
                addMessage('ai', `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
            return;
        }

        // Normal chat flow
        addMessage('user', prompt);
        setIsLoading(true);

        try {
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt }),
            });

            const data = await res.json();

            if (data.response) {
                addMessage('ai', data.response);
            } else {
                // Fallback for empty Gemini response
                addMessage('ai', "Sorry, I couldn't get a response from Gemini. Please try again.");
            }
        } catch (error) {
            console.error("Chat error:", error);
            addMessage('ai', "Network error, please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleDownload = async (url: string) => {
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = `generated-image-${Date.now()}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(blobUrl);
        } catch (error) {
            console.error('Download failed:', error);
            window.open(url, '_blank');
        }
    };



    return (
        <div className="flex-1 flex flex-col h-full relative overflow-hidden">
            {/* Header with Toggles */}
            <div className="h-16 flex items-center justify-between px-4 border-b border-white/5 bg-black/20 backdrop-blur-md z-30 shrink-0">
                <div className="hover:bg-white/5 rounded-lg transition-colors">
                    <Toggle3D type="panel" side="left" isOpen={isLeftSidebarOpen} onClick={toggleLeftSidebar} />
                </div>

                <span className="font-medium text-white/80 tracking-wide">From Heaven To Horizon</span>

                <div className="hover:bg-white/5 rounded-lg transition-colors">
                    <Toggle3D type="panel" side="right" isOpen={isRightSidebarOpen} onClick={toggleRightSidebar} />
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 flex flex-col p-4 md:p-8 overflow-y-auto custom-scrollbar scroll-smooth">
                {chatHistory.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8 }}
                            className="text-center space-y-6 max-w-2xl"
                        >
                            {!user ? (
                                <>
                                    <h1 className="text-5xl md:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 pb-2">
                                        Welcome to Xieriee
                                    </h1>
                                    <p className="text-xl text-white/60 font-light">
                                        Please sign in to start chatting with AI
                                    </p>
                                    <button
                                        onClick={() => window.location.href = '/handler/sign-in'}
                                        className="mt-6 px-8 py-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white font-medium rounded-lg hover:from-purple-600 hover:to-blue-600 transition-all shadow-lg"
                                    >
                                        Sign In
                                    </button>
                                </>
                            ) : (
                                <>
                                    <h1 className="text-5xl md:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 pb-2">
                                        Hello, {user.displayName || 'Human'}
                                    </h1>
                                    <p className="text-xl text-white/60 font-light">
                                        How can I help you create today?
                                    </p>
                                </>
                            )}
                        </motion.div>
                    </div>
                ) : (
                    <div className="space-y-6 max-w-4xl mx-auto w-full pb-4">
                        <AnimatePresence>
                            {chatHistory.map((msg) => (
                                <motion.div
                                    key={msg.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                >
                                    {msg.role === 'ai' && (
                                        <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 mt-1 bg-black/20 border border-white/10">
                                            <GeminiLogo3D />
                                        </div>
                                    )}

                                    <div className={`max-w-[80%] md:max-w-[70%] p-4 rounded-2xl ${msg.role === 'user'
                                        ? 'bg-white/10 text-white rounded-tr-sm'
                                        : 'bg-transparent text-gray-100 rounded-tl-sm'
                                        }`}>
                                        {(() => {
                                            // Check for markdown image syntax
                                            const imageMatch = msg.content.match(/!\[.*?\]\((.*?)\)/);
                                            const imageUrl = imageMatch ? imageMatch[1] : null;

                                            // Remove the image markdown from the text to avoid double rendering
                                            // but keep the rest of the message
                                            const textContent = imageUrl
                                                ? msg.content.replace(/!\[.*?\]\(.*?\)/, '').trim()
                                                : msg.content;

                                            return (
                                                <>
                                                    {imageUrl && (
                                                        <ImageMessage imageUrl={imageUrl} onDownload={handleDownload} />
                                                    )}
                                                    {textContent && (
                                                        <p className="whitespace-pre-wrap leading-relaxed">{textContent}</p>
                                                    )}
                                                </>
                                            );
                                        })()}
                                    </div>

                                    {msg.role === 'user' && (
                                        <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 mt-1 border border-white/10">
                                            <img
                                                src={userAvatar}
                                                alt="User"
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                    )}
                                </motion.div>
                            ))}
                            {isGeneratingImage && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="flex gap-4 justify-start"
                                >
                                    <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 mt-1 bg-black/20 border border-white/10">
                                        <GeminiLogo3D />
                                    </div>
                                    <div className="max-w-[80%] md:max-w-[60%] w-full">
                                        <ImageGenerationSkeleton />
                                    </div>
                                </motion.div>
                            )}
                            {isLoading && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="flex gap-4 justify-start"
                                >
                                    <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 mt-1 bg-black/20 border border-white/10">
                                        <GeminiLogo3D />
                                    </div>
                                    <div className="flex items-center gap-1 p-4">
                                        <div className="w-2 h-2 bg-white/50 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                                        <div className="w-2 h-2 bg-white/50 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                                        <div className="w-2 h-2 bg-white/50 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                        <div ref={messagesEndRef} />
                    </div>
                )}
            </div>

            {/* Input Area */}
            <div className="p-6 max-w-4xl w-full mx-auto z-20">
                <div className="relative bg-[#1e1e1e]/80 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl shadow-purple-900/20">
                    <textarea
                        value={inputPrompt}
                        onChange={(e) => setInputPrompt(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={!user ? "Please sign in to start chatting..." : "Ask anything... (type @image to generate images)"}
                        disabled={!user}
                        className="w-full bg-transparent text-white placeholder-white/40 p-4 pl-6 pr-16 min-h-[60px] max-h-[200px] resize-none outline-none rounded-3xl custom-scrollbar disabled:cursor-not-allowed disabled:opacity-50"
                        rows={1}
                    />

                    <div className="flex items-center justify-between px-4 pb-3">
                        <div className="flex items-center gap-2">
                            <button disabled={!user} className="p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-30">
                                <Paperclip size={20} />
                            </button>
                            <button disabled={!user} className="p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-30">
                                <ImageIcon size={20} />
                            </button>
                        </div>

                        <button
                            onClick={handleSend}
                            disabled={!user || !inputPrompt.trim() || isLoading}
                            className={`p-3 rounded-full transition-all duration-300 ${user && inputPrompt.trim() && !isLoading ? 'bg-white text-black hover:bg-gray-200' : 'bg-white/10 text-white/30 cursor-not-allowed'
                                }`}
                        >
                            <Send size={20} />
                        </button>
                    </div>
                </div>
                <p className="text-center text-xs text-white/30 mt-4">
                    Xieriee 1.0
                </p>
            </div>
        </div>
    );
}
