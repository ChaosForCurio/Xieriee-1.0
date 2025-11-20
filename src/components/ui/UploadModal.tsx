'use client';

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, Image as ImageIcon, Sparkles } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useUser } from "@stackframe/stack";

export default function UploadModal() {
    const { isUploadModalOpen, toggleUploadModal, addToFeed } = useApp();
    const user = useUser();
    const [prompt, setPrompt] = useState('');
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const analyzeImage = async (base64Image: string) => {
        setIsAnalyzing(true);
        try {
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: "Describe this image in detail so it can be recreated by an AI image generator. Focus on style, colors, lighting, and subject matter.",
                    image: base64Image
                }),
            });
            const data = await res.json();
            if (data.response) {
                setPrompt(data.response);
            }
        } catch (error) {
            console.error("Error analyzing image:", error);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.type === 'image/png' || file.type === 'image/jpeg' || file.type === 'image/jpg') {
                const reader = new FileReader();
                reader.onloadend = () => {
                    const result = reader.result as string;
                    setSelectedImage(result);
                    analyzeImage(result);
                };
                reader.readAsDataURL(file);
            } else {
                alert('Please upload a PNG or JPG image.');
            }
        }
    };

    const handleUpload = () => {
        if (!selectedImage || !prompt.trim()) return;

        const newItem = {
            id: Date.now(),
            user: user?.displayName || 'Anonymous',
            avatar: user?.profileImageUrl || 'https://i.pravatar.cc/150?img=68',
            prompt: prompt.trim(),
            likes: '0',
            image: selectedImage
        };

        addToFeed(newItem);
        resetForm();
        toggleUploadModal();
    };

    const resetForm = () => {
        setPrompt('');
        setSelectedImage(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleClose = () => {
        resetForm();
        toggleUploadModal();
    };

    return (
        <AnimatePresence>
            {isUploadModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={handleClose}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    />
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        className="relative bg-[#1e1e1e] border border-white/10 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-white/5 bg-white/5">
                            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                                <Sparkles className="text-purple-400" size={20} />
                                Share to Community
                            </h2>
                            <button
                                onClick={handleClose}
                                className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6 space-y-6">
                            {/* Image Upload Area */}
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all ${selectedImage
                                    ? 'border-purple-500/50 bg-purple-500/5'
                                    : 'border-white/10 hover:border-white/20 hover:bg-white/5'
                                    }`}
                            >
                                {selectedImage ? (
                                    <div className="relative w-full aspect-square rounded-lg overflow-hidden">
                                        <img
                                            src={selectedImage}
                                            alt="Preview"
                                            className="w-full h-full object-cover"
                                        />
                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                                            <span className="text-white font-medium">Change Image</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center text-gray-400">
                                        <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <ImageIcon size={32} />
                                        </div>
                                        <p className="font-medium text-white mb-1">Click to upload image</p>
                                        <p className="text-sm text-gray-500">PNG, JPG up to 5MB</p>
                                    </div>
                                )}
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/png, image/jpeg, image/jpg"
                                    onChange={handleFileChange}
                                    className="hidden"
                                />
                            </div>

                            {/* Prompt Input */}
                            <div className="space-y-2 relative">
                                <div className="flex justify-between items-center">
                                    <label className="text-sm font-medium text-gray-300">Prompt</label>
                                    {isAnalyzing && (
                                        <span className="text-xs text-purple-400 flex items-center gap-1 animate-pulse">
                                            <Sparkles size={12} />
                                            Analyzing image...
                                        </span>
                                    )}
                                </div>
                                <div className="relative">
                                    <textarea
                                        value={prompt}
                                        onChange={(e) => setPrompt(e.target.value)}
                                        placeholder={isAnalyzing ? "Analyzing image..." : "Describe your image..."}
                                        disabled={isAnalyzing}
                                        className={`w-full bg-black/20 border rounded-xl p-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 min-h-[80px] resize-none transition-all ${isAnalyzing ? 'border-purple-500/30 opacity-70 cursor-wait' : 'border-white/10'}`}
                                    />
                                    {isAnalyzing && (
                                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                            <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <button
                                onClick={handleUpload}
                                disabled={!selectedImage || !prompt.trim()}
                                className={`w-full py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-all ${selectedImage && prompt.trim()
                                    ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:shadow-lg hover:shadow-purple-500/25'
                                    : 'bg-white/5 text-gray-500 cursor-not-allowed'
                                    }`}
                            >
                                <Upload size={18} />
                                Share to Feed
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
