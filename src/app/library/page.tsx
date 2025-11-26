'use client';

import React, { useEffect, useState } from 'react';
import { useUser } from "@stackframe/stack";
import { ArrowLeft, Image, Trash2 } from 'lucide-react';
import Link from 'next/link';
import Lenis from '@studio-freight/lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

interface UserImage {
    id: number;
    imageUrl: string;
    createdAt: string;
}

export default function LibraryPage() {
    const user = useUser();
    const [images, setImages] = useState<UserImage[]>([]);
    const [loading, setLoading] = useState(true);
    const [deletingId, setDeletingId] = useState<number | null>(null);

    const [imageToDelete, setImageToDelete] = useState<number | null>(null);

    useEffect(() => {
        gsap.registerPlugin(ScrollTrigger);

        const lenis = new Lenis({
            duration: 1.2,
            easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
            direction: 'vertical',
            gestureDirection: 'vertical',
            smooth: true,
            mouseMultiplier: 1,
            smoothTouch: false,
            touchMultiplier: 2,
        } as any);

        lenis.on('scroll', () => ScrollTrigger.update());

        const update = (time: number) => {
            lenis.raf(time * 1000);
        };

        gsap.ticker.add(update);

        gsap.ticker.lagSmoothing(0);

        return () => {
            lenis.destroy();
            gsap.ticker.remove(update);
        };
    }, []);

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

    const confirmDelete = (id: number) => {
        setImageToDelete(id);
    };

    const handleDelete = async () => {
        if (!imageToDelete) return;

        const id = imageToDelete;
        setDeletingId(id);
        try {
            const res = await fetch(`/api/library?id=${id}`, {
                method: 'DELETE',
            });

            if (res.ok) {
                setImages(images.filter(img => img.id !== id));
                setImageToDelete(null);
            } else {
                alert('Failed to delete image');
            }
        } catch (error) {
            console.error('Failed to delete image:', error);
            alert('An error occurred while deleting');
        } finally {
            setDeletingId(null);
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
        <div className="min-h-screen bg-black text-white relative">
            {/* Delete Confirmation Modal */}
            {imageToDelete !== null && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-6 max-w-sm w-full shadow-2xl transform transition-all scale-100">
                        <h3 className="text-xl font-semibold mb-2 text-white">Delete Image?</h3>
                        <p className="text-gray-400 mb-6">This action cannot be undone. The image will be permanently removed from your library.</p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setImageToDelete(null)}
                                className="flex-1 px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl font-medium transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={deletingId === imageToDelete}
                                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                            >
                                {deletingId === imageToDelete ? (
                                    <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <Trash2 size={18} />
                                        <span>Delete</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

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
                            <Image size={32} className="text-gray-500" />
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
                                <div className="absolute bottom-2 right-2 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => confirmDelete(img.id)}
                                        className="p-2 bg-black/60 hover:bg-red-600 text-white/80 hover:text-white rounded-full backdrop-blur-sm transition-all shadow-lg"
                                        title="Delete"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
