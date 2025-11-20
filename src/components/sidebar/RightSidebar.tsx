'use client';

import React from 'react';
import { Heart, Share2, MoreVertical, Sparkles, ArrowUpRight } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import Toggle3D from '../ui/Toggle3D';

export default function RightSidebar() {
    const { setInputPrompt, toggleRightSidebar, communityFeed } = useApp();

    return (
        <div className="h-full flex flex-col bg-[#0a0a0a] border-l border-white/5">
            <div className="p-4 border-b border-white/5 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Sparkles size={16} className="text-purple-400" />
                    Community Feed
                </h2>
                <div className="hover:bg-white/10 rounded-lg transition-colors">
                    <Toggle3D type="panel" isOpen={true} onClick={toggleRightSidebar} />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
                {communityFeed.map((item) => (
                    <div key={item.id} className="group relative rounded-xl overflow-hidden bg-white/5 border border-white/5 hover:border-white/10 transition-all">
                        {/* User Info - Always Visible at Top */}
                        <div className="absolute top-3 left-3 z-10 flex items-center gap-2 bg-black/60 backdrop-blur-md rounded-full px-3 py-1.5 border border-white/10">
                            <img
                                src={item.avatar}
                                alt={item.user}
                                className="w-6 h-6 rounded-full object-cover border-2 border-white/20"
                            />
                            <span className="text-xs font-medium text-white">{item.user}</span>
                        </div>

                        {/* Image */}
                        <img
                            src={item.image}
                            alt={item.prompt}
                            className="aspect-square w-full object-cover transition-opacity"
                        />

                        {/* Overlay Content */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent flex flex-col justify-end p-3">
                            <p className="text-xs text-white/90 line-clamp-2 mb-2 font-medium">
                                "{item.prompt}"
                            </p>

                            <div className="flex items-center justify-between text-white/70 mb-2">
                                <div className="flex items-center gap-1 text-xs">
                                    <Heart size={14} />
                                    <span>{item.likes}</span>
                                </div>
                                <button className="p-1 hover:bg-white/20 rounded-full transition-colors">
                                    <Share2 size={14} />
                                </button>
                            </div>

                            {/* Use Prompt Button */}
                            <button
                                onClick={() => setInputPrompt(item.prompt)}
                                className="w-full py-1.5 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-lg text-xs font-medium text-white flex items-center justify-center gap-1 transition-colors border border-white/10"
                            >
                                <ArrowUpRight size={12} />
                                Use Prompt
                            </button>
                        </div>
                    </div>
                ))}

                {/* Coming Soon Placeholder */}
                <div className="text-center py-8">
                    <p className="text-gray-500 text-sm">Community feed coming soon!</p>
                    <p className="text-gray-600 text-xs mt-2">&quot;Share your creations with the world&quot;</p>
                </div>
            </div>
        </div>
    );
}
