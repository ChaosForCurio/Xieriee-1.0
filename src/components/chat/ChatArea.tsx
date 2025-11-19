'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Send, Paperclip, Mic, Image as ImageIcon, Sparkles, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '@/context/AppContext';
import GeminiLogo3D from '../ui/GeminiLogo3D';
import Toggle3D from '../ui/Toggle3D';

export default function ChatArea() {
    const { inputPrompt, setInputPrompt, chatHistory, addMessage, toggleLeftSidebar, toggleRightSidebar, isLeftSidebarOpen, isRightSidebarOpen } = useApp();
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

        const prompt = inputPrompt;
        setInputPrompt(''); // Clear input immediately
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
                addMessage('ai', "Sorry, I couldn't get a response.");
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

    const suggestions = [
        { icon: <Sparkles size={20} />, text: "Create a cyberpunk city image" },
        { icon: <ImageIcon size={20} />, text: "Analyze this photo" },
        { icon: <Mic size={20} />, text: "Explain quantum physics" },
    ];

    return (
        <div className="flex-1 flex flex-col h-full relative overflow-hidden">
            {/* Header with Toggles */}
            <div className="h-16 flex items-center justify-between px-4 border-b border-white/5 bg-black/20 backdrop-blur-md z-30 shrink-0">
                <div className="hover:bg-white/5 rounded-lg transition-colors">
                    <Toggle3D type="panel" side="left" isOpen={isLeftSidebarOpen} onClick={toggleLeftSidebar} />
                </div>

                <span className="font-medium text-white/80 tracking-wide">Gemini 2.0 Flash</span>

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
                            <h1 className="text-5xl md:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 pb-2">
                                Hello, Human
                            </h1>
                            <p className="text-xl text-white/60 font-light">
                                How can I help you create today?
                            </p>

                            {/* Suggestions Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-12 w-full">
                                {suggestions.map((item, idx) => (
                                    <motion.button
                                        key={idx}
                                        whileHover={{ scale: 1.05, backgroundColor: "rgba(255,255,255,0.1)" }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => setInputPrompt(item.text)}
                                        className="flex flex-col items-center justify-center p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm transition-colors gap-4 group"
                                    >
                                        <div className="p-3 rounded-full bg-white/10 group-hover:bg-blue-500/20 group-hover:text-blue-400 transition-colors">
                                            {item.icon}
                                        </div>
                                        <span className="text-sm text-white/70 font-medium">{item.text}</span>
                                    </motion.button>
                                ))}
                            </div>
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
                                        <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                                    </div>

                                    {msg.role === 'user' && (
                                        <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center shrink-0 mt-1">
                                            <User size={16} className="text-white" />
                                        </div>
                                    )}
                                </motion.div>
                            ))}
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
                        placeholder="Ask anything..."
                        className="w-full bg-transparent text-white placeholder-white/40 p-4 pl-6 pr-16 min-h-[60px] max-h-[200px] resize-none outline-none rounded-3xl custom-scrollbar"
                        rows={1}
                    />

                    <div className="flex items-center justify-between px-4 pb-3">
                        <div className="flex items-center gap-2">
                            <button className="p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-full transition-colors">
                                <Paperclip size={20} />
                            </button>
                            <button className="p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-full transition-colors">
                                <ImageIcon size={20} />
                            </button>
                        </div>

                        <button
                            onClick={handleSend}
                            disabled={!inputPrompt.trim() || isLoading}
                            className={`p-3 rounded-full transition-all duration-300 ${inputPrompt.trim() && !isLoading ? 'bg-white text-black hover:bg-gray-200' : 'bg-white/10 text-white/30 cursor-not-allowed'
                                }`}
                        >
                            <Send size={20} />
                        </button>
                    </div>
                </div>
                <p className="text-center text-xs text-white/30 mt-4">
                    Gemini may display inaccurate info, including about people, so double-check its responses.
                </p>
            </div>
        </div>
    );
}
