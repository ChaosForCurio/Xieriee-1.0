'use client';
/* eslint-disable @next/next/no-img-element */

import React from 'react';
import { MessageSquare, Plus, Settings, MoreHorizontal, Trash2, LogOut } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import Toggle3D from '../ui/Toggle3D';
import { useUser, UserButton } from "@stackframe/stack";

export default function LeftSidebar() {
    const { chatHistory, clearHistory, toggleLeftSidebar, savedChats, startNewChat, loadChat, deleteChat, isLeftSidebarOpen, toggleUploadModal, currentChatId } = useApp();
    const user = useUser();

    // Mock history removed as per user request

    // In a real app, we would group the actual chatHistory here.
    // For this demo, we'll show the current session as "Today" if it has messages.
    const hasCurrentSession = chatHistory.length > 0;

    return (
        <div className="h-full flex flex-col bg-[#0a0a0a] border-r border-white/5">
            {/* Header / New Chat */}
            <div className="p-4 flex items-center gap-2">
                <button
                    onClick={startNewChat}
                    disabled={savedChats.length >= 6}
                    className={`flex-1 flex items-center gap-3 px-4 py-3 transition-colors rounded-xl text-sm font-medium border border-white/5 ${savedChats.length >= 6
                        ? 'bg-white/5 text-gray-500 cursor-not-allowed opacity-50'
                        : 'bg-white/5 hover:bg-white/10 text-gray-200'
                        }`}
                >
                    <Plus size={18} />
                    <span>New Chat</span>
                </button>
                <div className="bg-white/5 hover:bg-white/10 transition-colors rounded-xl border border-white/5">
                    <div className="hidden lg:block">
                        <Toggle3D type="panel" isOpen={true} onClick={toggleLeftSidebar} />
                    </div>
                    <button
                        onClick={toggleLeftSidebar}
                        className="lg:hidden w-12 h-12 flex items-center justify-center text-white/80 hover:text-white transition-colors text-xl"
                    >
                        &lt;
                    </button>
                </div>
            </div>

            {/* Chat History Header */}
            <div className="px-4 py-3 flex items-center justify-between">
                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Chat History</h2>
                <span className="text-xs font-medium text-gray-500">{savedChats.length}/6</span>
            </div>

            {/* Chat History List */}
            <div className="flex-1 overflow-y-auto px-2 py-2 space-y-6 custom-scrollbar">

                {/* Active Chat */}
                {savedChats.some(chat => chat.id === currentChatId) && (
                    <div>
                        <h3 className="px-4 text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">Active Chat</h3>
                        <div className="space-y-1">
                            {savedChats.filter(chat => chat.id === currentChatId).map(chat => (
                                <div key={chat.id} className="group relative px-2">
                                    <button
                                        onClick={() => loadChat(chat.id)}
                                        className="w-full flex items-center gap-3 px-4 py-2 text-sm text-white bg-white/10 rounded-lg transition-colors border border-white/10"
                                    >
                                        <MessageSquare size={16} className="shrink-0 text-purple-400" />
                                        <span className="truncate text-left flex-1 font-medium">{chat.title}</span>
                                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Chat History */}
                {savedChats.filter(chat => chat.id !== currentChatId).length > 0 && (
                    <div>
                        <h3 className="px-4 text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">Chat History</h3>
                        <div className="space-y-1">
                            {savedChats
                                .filter(chat => chat.id !== currentChatId)
                                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                .map((chat) => (
                                    <div key={chat.id} className="group relative px-2">
                                        <button
                                            onClick={() => loadChat(chat.id)}
                                            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                                        >
                                            <MessageSquare size={16} className="shrink-0" />
                                            <span className="truncate text-left flex-1">{chat.title}</span>
                                            <span className="text-[10px] text-gray-600">{chat.date}</span>
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                deleteChat(chat.id);
                                            }}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 text-gray-500 hover:text-red-400 hover:bg-white/10 rounded-md transition-all opacity-0 group-hover:opacity-100"
                                            title="Delete chat"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))}
                        </div>
                    </div>
                )}
            </div>

            {/* User Profile / Footer */}
            <div className="p-4 border-t border-white/5">
                <button
                    onClick={toggleUploadModal}
                    className="w-full flex items-center gap-3 px-3 py-2 mb-2 bg-gradient-to-r from-purple-600/20 to-blue-600/20 hover:from-purple-600/30 hover:to-blue-600/30 border border-purple-500/30 hover:border-purple-500/50 rounded-lg transition-all group"
                >
                    <div className="p-1.5 bg-purple-500/20 rounded-md text-purple-400 group-hover:text-purple-300 transition-colors">
                        <Plus size={16} />
                    </div>
                    <div className="text-left">
                        <div className="text-sm font-medium text-gray-200 group-hover:text-white">Upload Image</div>
                        <div className="text-[10px] text-gray-500 group-hover:text-gray-400">Share with community</div>
                    </div>
                </button>

                <div className="mb-2">
                    {user ? (
                        <div className="flex items-center gap-3 px-3 py-2 hover:bg-white/5 rounded-lg transition-colors text-left group relative">
                            <div className="relative w-8 h-8">
                                <UserButton />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-gray-200 truncate">{user.displayName || 'User'}</div>
                                <div className="text-xs text-gray-500 truncate">{user.primaryEmail || 'Free Plan'}</div>
                            </div>
                            <Settings size={16} className="text-gray-500" />
                        </div>
                    ) : (
                        <button
                            onClick={() => window.location.href = '/handler/sign-in'}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-white text-black rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                        >
                            <span>Sign In</span>
                        </button>
                    )}
                </div>

                <button
                    onClick={clearHistory}
                    className="w-full flex items-center gap-3 px-3 py-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors text-sm"
                >
                    <Trash2 size={16} />
                    <span>Clear Conversation</span>
                </button>

                {user && (
                    <button
                        onClick={() => {
                            if (isLeftSidebarOpen) toggleLeftSidebar();
                            user.signOut();
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2 mt-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors text-sm"
                    >
                        <LogOut size={16} />
                        <span>Sign Out</span>
                    </button>
                )}
            </div>
        </div >
    );
}
