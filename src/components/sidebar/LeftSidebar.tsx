'use client';

import React from 'react';
import { MessageSquare, Plus, Settings, MoreHorizontal, Trash2 } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import Toggle3D from '../ui/Toggle3D';

export default function LeftSidebar() {
    const { chatHistory, clearHistory, setInputPrompt, toggleLeftSidebar, userAvatar, setUserAvatar } = useApp();

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setUserAvatar(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    // Mock history data combined with real current session
    const mockHistory = [
        { id: 'm1', title: "Project Ideas", date: "Yesterday" },
        { id: 'm2', title: "React Components", date: "Yesterday" },
        { id: 'm3', title: "Tailwind Tips", date: "Previous 7 Days" },
        { id: 'm4', title: "AI Ethics Discussion", date: "Previous 7 Days" },
    ];

    // In a real app, we would group the actual chatHistory here.
    // For this demo, we'll show the current session as "Today" if it has messages.
    const hasCurrentSession = chatHistory.length > 0;

    return (
        <div className="h-full flex flex-col bg-[#0a0a0a] border-r border-white/5">
            {/* Header / New Chat */}
            <div className="p-4 flex items-center gap-2">
                <button
                    onClick={() => {
                        clearHistory();
                        setInputPrompt('');
                    }}
                    className="flex-1 flex items-center gap-3 px-4 py-3 bg-white/5 hover:bg-white/10 transition-colors rounded-xl text-sm font-medium text-gray-200 border border-white/5"
                >
                    <Plus size={18} />
                    <span>New Chat</span>
                </button>
                <div className="bg-white/5 hover:bg-white/10 transition-colors rounded-xl border border-white/5">
                    <Toggle3D type="panel" isOpen={true} onClick={toggleLeftSidebar} />
                </div>
            </div>

            {/* Chat History Header */}
            <div className="px-4 py-3">
                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Chat History</h2>
            </div>

            {/* Chat History List */}
            <div className="flex-1 overflow-y-auto px-2 py-2 space-y-6 custom-scrollbar">

                {/* Today's Session */}
                {hasCurrentSession && (
                    <div>
                        <h3 className="px-4 text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">Today</h3>
                        <div className="space-y-1">
                            <button className="w-full flex items-center gap-3 px-4 py-2 text-sm text-white bg-white/10 rounded-lg transition-colors group">
                                <MessageSquare size={16} className="shrink-0" />
                                <span className="truncate text-left flex-1">
                                    {chatHistory[0]?.content.slice(0, 20)}...
                                </span>
                                <MoreHorizontal size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                            </button>
                        </div>
                    </div>
                )}

                {/* Yesterday */}
                <div>
                    <h3 className="px-4 text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">Yesterday</h3>
                    <div className="space-y-1">
                        {mockHistory.filter(h => h.date === 'Yesterday').map((chat) => (
                            <button
                                key={chat.id}
                                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors group"
                            >
                                <MessageSquare size={16} className="shrink-0" />
                                <span className="truncate text-left flex-1">{chat.title}</span>
                                <MoreHorizontal size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                            </button>
                        ))}
                    </div>
                </div>

                {/* Previous 7 Days */}
                <div>
                    <h3 className="px-4 text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">Previous 7 Days</h3>
                    <div className="space-y-1">
                        {mockHistory.filter(h => h.date === 'Previous 7 Days').map((chat) => (
                            <button
                                key={chat.id}
                                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors group"
                            >
                                <MessageSquare size={16} className="shrink-0" />
                                <span className="truncate text-left flex-1">{chat.title}</span>
                                <MoreHorizontal size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* User Profile / Footer */}
            <div className="p-4 border-t border-white/5">
                <button className="w-full flex items-center gap-3 px-3 py-2 hover:bg-white/5 rounded-lg transition-colors text-left mb-2 group relative">
                    <div className="relative">
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleAvatarChange}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            title="Change profile picture"
                        />
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold text-xs overflow-hidden border-2 border-transparent group-hover:border-purple-400 transition-colors">
                            {userAvatar.startsWith('data:') || userAvatar.startsWith('http') ? (
                                <img src={userAvatar} alt="User" className="w-full h-full object-cover" />
                            ) : (
                                'U'
                            )}
                        </div>
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-full flex items-center justify-center">
                            <span className="text-[8px] text-white font-medium">Edit</span>
                        </div>
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-200 truncate">User Name</div>
                        <div className="text-xs text-gray-500 truncate">Free Plan</div>
                    </div>
                    <Settings size={16} className="text-gray-500" />
                </button>

                <button
                    onClick={clearHistory}
                    className="w-full flex items-center gap-3 px-3 py-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors text-sm"
                >
                    <Trash2 size={16} />
                    <span>Clear Conversation</span>
                </button>
            </div>
        </div>
    );
}
