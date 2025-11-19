'use client';

import React from 'react';
import { Heart, Share2, MoreVertical, Sparkles, ArrowUpRight } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import Toggle3D from '../ui/Toggle3D';

export default function RightSidebar() {
    const { setInputPrompt, toggleRightSidebar } = useApp();

    const feedItems = [
        {
            id: 1,
            user: "CyberPunk_Artist",
            avatar: "https://i.pravatar.cc/150?img=1",
            prompt: "Neon lit rainy street in Tokyo, cyberpunk style, 8k resolution",
            likes: "1.2k",
            image: "https://picsum.photos/seed/cyberpunk/400/400"
        },
        {
            id: 2,
            user: "NatureLover",
            avatar: "https://i.pravatar.cc/150?img=5",
            prompt: "Peaceful mountain lake reflection at sunrise, photorealistic",
            likes: "856",
            image: "https://picsum.photos/seed/nature/400/400"
        },
        {
            id: 3,
            user: "AbstractMind",
            avatar: "https://i.pravatar.cc/150?img=12",
            prompt: "Swirling galaxies colliding with geometric shapes, abstract art",
            likes: "2.4k",
            image: "https://picsum.photos/seed/abstract/400/400"
        },
        {
            id: 4,
            user: "RetroFuture",
            avatar: "https://i.pravatar.cc/150?img=8",
            prompt: "1980s synthwave sunset grid, retro style, vibrant colors",
            likes: "3.1k",
            image: "https://picsum.photos/seed/retro/400/400"
        }
    ];

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
                {feedItems.map((item) => (
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
                            className="aspect-square w-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                        />

                        {/* Overlay Content */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
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

                        {/* Always visible header */}
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button className="p-1 bg-black/50 backdrop-blur-md rounded-full text-white hover:bg-black/70">
                                <MoreVertical size={14} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            <div className="p-4 border-t border-white/5">
                <button className="w-full py-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg text-sm font-medium text-white hover:opacity-90 transition-opacity shadow-lg shadow-purple-900/20">
                    Generate Image
                </button>
            </div>
        </div>
    );
}
