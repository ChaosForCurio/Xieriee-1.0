'use client';
/* eslint-disable @next/next/no-img-element */

import React, { useState } from 'react';
import { Heart, Share2, MoreVertical, Sparkles, ArrowUpRight, Trash2 } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import Toggle3D from '../ui/Toggle3D';
import { useUser } from "@stackframe/stack";

const FeedItemImage = ({ src, alt, onClick }: { src: string, alt: string, onClick: () => void }) => {
    const [hasError, setHasError] = useState(false);

    if (hasError) {
        return (
            <div
                className="aspect-square relative overflow-hidden cursor-pointer bg-white/5 flex flex-col items-center justify-center text-white/20 gap-1"
                onClick={onClick}
            >
                <Sparkles size={20} className="opacity-50" />
                <span className="text-[10px]">Image unavailable</span>
            </div>
        );
    }

    return (
        <div
            className="aspect-square relative overflow-hidden cursor-pointer"
            onClick={onClick}
        >
            <img
                src={src}
                alt={alt}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                onError={() => setHasError(true)}
                loading="lazy"
            />
        </div>
    );
};

export default function RightSidebar() {
    const { setInputPrompt, toggleRightSidebar, communityFeed, deleteFeedItem, likeFeedItem } = useApp();
    const user = useUser();

    return (
        <div className="h-full flex flex-col bg-[#0a0a0a] border-l border-white/5">
            <div className="p-4 border-b border-white/5 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Sparkles size={16} className="text-purple-400" />
                    Community Feed
                </h2>
                <div className="hover:bg-white/10 rounded-lg transition-colors">
                    <div className="hidden lg:block">
                        <Toggle3D type="panel" isOpen={true} onClick={toggleRightSidebar} />
                    </div>
                    <button
                        onClick={toggleRightSidebar}
                        className="lg:hidden w-12 h-12 flex items-center justify-center text-white/80 hover:text-white transition-colors text-xl"
                    >
                        &gt;
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
                {communityFeed.length > 0 ? (
                    <div className="grid grid-cols-1 gap-4">
                        {communityFeed.map((item) => (
                            <div key={item.id} className="group bg-white/5 rounded-lg overflow-hidden border border-white/5 hover:border-white/20 transition-all flex flex-col">
                                {/* Image */}
                                <FeedItemImage
                                    src={item.image}
                                    alt={item.prompt}
                                    onClick={() => setInputPrompt(item.prompt)}
                                />

                                {/* Content */}
                                <div className="p-2 flex flex-col gap-2">
                                    {/* Prompt - Always Visible */}
                                    <p
                                        className="text-[10px] text-white/90 line-clamp-2 leading-tight h-[2.4em]"
                                        title={item.prompt}
                                    >
                                        {item.prompt}
                                    </p>

                                    {/* Footer */}
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-1.5 min-w-0">
                                            <img
                                                src={item.avatar}
                                                alt={item.user}
                                                className="w-4 h-4 rounded-full object-cover border border-white/30 shrink-0"
                                            />
                                            <span className="text-[10px] font-medium text-white/60 truncate">{item.user}</span>

                                            {/* Delete Button (Only for owner) */}
                                            {user && (user.id === item.userId || user.displayName === item.user) && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (confirm('Delete this post?')) {
                                                            deleteFeedItem(item.id);
                                                        }
                                                    }}
                                                    className="ml-1 p-1 text-gray-500 hover:text-red-400 transition-colors"
                                                    title="Delete post"
                                                >
                                                    <Trash2 size={12} />
                                                </button>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-2">
                                            {/* Like Button */}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    likeFeedItem(item.id);
                                                }}
                                                className="group/like flex items-center gap-1 text-white/60 hover:text-red-400 transition-colors"
                                            >
                                                <Heart
                                                    size={12}
                                                    className={`transition-all duration-300 ${item.likes > 0 ? 'fill-red-500 text-red-500' : 'group-hover/like:scale-110'}`}
                                                />
                                                <span className="text-[10px]">{item.likes}</span>
                                            </button>

                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setInputPrompt(item.prompt);
                                                }}
                                                className="px-2 py-0.5 bg-white/10 hover:bg-white/20 text-white text-[9px] font-medium rounded transition-colors shrink-0"
                                            >
                                                USE
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center p-4 text-gray-500">
                        <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mb-3">
                            <Sparkles size={20} className="text-purple-400/50" />
                        </div>
                        <p className="text-sm font-medium text-gray-400">Community Feed</p>
                        <p className="text-xs mt-1">Share your creations with the world</p>
                    </div>
                )}
            </div>
        </div>
    );
}
