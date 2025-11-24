'use client';

import React, { useEffect, useState } from 'react';
import { useUser } from "@stackframe/stack";
import { ArrowLeft, Download, ExternalLink } from 'lucide-react';
import Link from 'next/link';

interface UserImage {
    id: number;
    imageUrl: string;
    createdAt: string;
}

export default function LibraryPage() {
    const user = useUser();
    const [images, setImages] = useState<UserImage[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) {
            fetchImages();
        }
    }, [user]);

    const fetchImages = async () => {
        try {
            const res = await fetch('/api/library');
            if (res.ok) {
                const data = await res.json();
                setImages(data.images);
            }
        } catch (error) {
            console.error('Failed to fetch images:', error);
        } finally {
            setLoading(false);
        }
    };

    if (!user) {
        return (
            <div className="min-h-screen bg-black text-white flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-bold mb-4">Please Sign In</h1>
                    <p className="text-gray-400 mb-6">You need to be signed in to view your library.</p>
                    <Link href="/handler/sign-in" className="px-6 py-2 bg-white text-black rounded-lg font-medium hover:bg-gray-200 transition-colors">
                        Sign In
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white">
            {/* Header */}
            <header className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-md border-b border-white/10">
                <div className="max-w-7xl mx-auto px-4 h-16 flex items-center gap-4">
                    <Link href="/" className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                        <ArrowLeft size={20} />
                    </Link>
                    <h1 className="text-xl font-semibold">Your Library</h1>
                </div>
            </header>

            {/* Content */}
            <main className="pt-24 pb-12 px-4 max-w-7xl mx-auto">
                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : images.length === 0 ? (
                    <div className="text-center py-20">
                        <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <Download size={32} className="text-gray-500" />
                        </div>
                        <h2 className="text-xl font-medium text-gray-300 mb-2">No images yet</h2>
                        <p className="text-gray-500 mb-6">Upload images in the chat to see them here.</p>
                        <Link href="/" className="px-6 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors">
                            Go to Chat
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {images.map((img) => (
                            <div key={img.id} className="group relative aspect-square bg-white/5 rounded-xl overflow-hidden border border-white/5 hover:border-purple-500/50 transition-colors">
                                <img
                                    src={img.imageUrl}
                                    alt={`Upload ${img.id}`}
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                    loading="lazy"
                                />
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                    <a
                                        href={img.imageUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors"
                                        title="View Full Size"
                                    >
                                        <ExternalLink size={20} />
                                    </a>
                                    <a
                                        href={img.imageUrl}
                                        download
                                        className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors"
                                        title="Download"
                                    >
                                        <Download size={20} />
                                    </a>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
