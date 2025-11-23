'use client';
/* eslint-disable @next/next/no-img-element */

import imageCompression from 'browser-image-compression';

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

    const [fileToUpload, setFileToUpload] = useState<File | null>(null);

    const [isSharing, setIsSharing] = useState(false);

    const analyzeImage = async (base64Image: string) => {
        setIsAnalyzing(true);
        try {
            const res = await fetch('/api/analyze-image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: "Analyze this image and generate a highly detailed, professional AI image generation prompt. Structure it to include: Subject, Art Style, Lighting, Color Palette, and Composition. The output should be a single, cohesive paragraph suitable for a high-end image generator. Do not include any introductory text like 'Here is a prompt', just give the prompt itself.",
                    image: base64Image
                }),
            });

            const contentType = res.headers.get("content-type");
            if (contentType && contentType.indexOf("application/json") !== -1) {
                const data = await res.json();
                if (data.response) {
                    setPrompt(data.response);
                } else {
                    console.warn("No response field in data:", data);
                    alert("AI could not generate a prompt. Please try again or use a different image.");
                }
            } else {
                const text = await res.text();
                console.error("Server returned non-JSON response:", text);
                if (text.includes("Request Entity Too Large") || res.status === 413) {
                    alert("Image is too large. Please upload a smaller image.");
                } else {
                    alert("An error occurred while analyzing the image.");
                }
            }
        } catch (error) {
            console.error("Error analyzing image:", error);
            alert("Failed to analyze image. Please try again.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.type === 'image/png' || file.type === 'image/jpeg' || file.type === 'image/jpg') {
                try {
                    // Compress image before processing
                    const options = {
                        maxSizeMB: 0.5, // Compress to ~500KB for analysis
                        maxWidthOrHeight: 1024, // Resize to max 1024px
                        useWebWorker: true,
                    };

                    const compressedFile = await imageCompression(file, options);
                    setFileToUpload(compressedFile);

                    const reader = new FileReader();
                    reader.onloadend = () => {
                        const result = reader.result as string;
                        setSelectedImage(result);
                        analyzeImage(result);
                    };
                    reader.readAsDataURL(compressedFile);
                } catch (error) {
                    console.error("Compression failed:", error);
                    alert("Failed to process image. Please try a different one.");
                }
            } else {
                alert('Please upload a PNG or JPG image.');
            }
        }
    };

    const handleRegenerate = () => {
        if (selectedImage) {
            analyzeImage(selectedImage);
        }
    };

    const handleUpload = async () => {
        if (!selectedImage || !prompt.trim()) return;

        setIsSharing(true);

        const newItem = {
            id: Date.now(),
            user: user?.displayName || 'Anonymous',
            avatar: user?.profileImageUrl || 'https://i.pravatar.cc/150?img=68',
            prompt: prompt.trim(),
            likes: 0,
            image: selectedImage
        };

        try {
            await addToFeed(newItem, fileToUpload || undefined);
            // Wait a bit for the animation to play
            await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (error) {
            console.error("Failed to share:", error);
            alert("Failed to share to feed. Please try again.");
        } finally {
            setIsSharing(false);
            resetForm();
            toggleUploadModal();
        }
    };

    const resetForm = () => {
        setPrompt('');
        setSelectedImage(null);
        setFileToUpload(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleClose = () => {
        if (isSharing) return; // Prevent closing while sharing
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
                        className="absolute inset-0 bg-black/80 backdrop-blur-md"
                    />
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 20 }}
                        transition={{ type: "spring", duration: 0.5 }}
                        className="relative bg-[#121212] border border-white/10 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
                    >
                        {/* Success Overlay */}
                        <AnimatePresence>
                            {isSharing && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="absolute inset-0 z-50 bg-[#121212]/95 backdrop-blur-sm flex flex-col items-center justify-center text-center p-8"
                                >
                                    <motion.div
                                        initial={{ scale: 0.5, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        transition={{ delay: 0.1, type: "spring" }}
                                        className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mb-6"
                                    >
                                        <motion.svg
                                            initial={{ pathLength: 0 }}
                                            animate={{ pathLength: 1 }}
                                            transition={{ duration: 0.5, delay: 0.2 }}
                                            className="w-10 h-10 text-green-500"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                            strokeWidth={3}
                                        >
                                            <motion.path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                d="M5 13l4 4L19 7"
                                            />
                                        </motion.svg>
                                    </motion.div>
                                    <motion.h3
                                        initial={{ y: 20, opacity: 0 }}
                                        animate={{ y: 0, opacity: 1 }}
                                        transition={{ delay: 0.3 }}
                                        className="text-2xl font-bold text-white mb-2"
                                    >
                                        Shared Successfully!
                                    </motion.h3>
                                    <motion.p
                                        initial={{ y: 20, opacity: 0 }}
                                        animate={{ y: 0, opacity: 1 }}
                                        transition={{ delay: 0.4 }}
                                        className="text-gray-400"
                                    >
                                        Your masterpiece is now live in the community feed.
                                    </motion.p>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-white/5 bg-white/[0.02]">
                            <div>
                                <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                                    <Sparkles className="text-purple-400" size={24} />
                                    Share to Community
                                </h2>
                                <p className="text-sm text-gray-400 mt-1">Showcase your creations to the world</p>
                            </div>
                            <button
                                onClick={handleClose}
                                className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
                            {/* Image Upload Area */}
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className={`group relative border-2 border-dashed rounded-2xl p-1 transition-all cursor-pointer overflow-hidden ${selectedImage
                                    ? 'border-purple-500/30 bg-purple-500/5'
                                    : 'border-white/10 hover:border-purple-500/50 hover:bg-white/5'
                                    }`}
                            >
                                {selectedImage ? (
                                    <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black/50">
                                        <img
                                            src={selectedImage}
                                            alt="Preview"
                                            className="w-full h-full object-contain"
                                        />
                                        <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 backdrop-blur-sm">
                                            <ImageIcon size={32} className="text-white mb-2" />
                                            <span className="text-white font-medium">Click to change image</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="py-12 flex flex-col items-center justify-center text-center">
                                        <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 group-hover:bg-purple-500/20">
                                            <Upload size={32} className="text-gray-400 group-hover:text-purple-400 transition-colors" />
                                        </div>
                                        <p className="text-lg font-medium text-white mb-2">Upload your masterpiece</p>
                                        <p className="text-sm text-gray-500 max-w-[200px]">
                                            Support for PNG, JPG & JPEG up to 5MB
                                        </p>
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
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                                        Prompt
                                        {selectedImage && !isAnalyzing && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleRegenerate(); }}
                                                className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors"
                                                title="Regenerate AI Prompt"
                                            >
                                                <Sparkles size={12} />
                                                Regenerate
                                            </button>
                                        )}
                                    </label>
                                    {isAnalyzing && (
                                        <span className="text-xs text-purple-400 flex items-center gap-1 animate-pulse font-medium">
                                            <Sparkles size={12} />
                                            AI is analyzing your image...
                                        </span>
                                    )}
                                </div>
                                <div className="relative group">
                                    <textarea
                                        value={prompt}
                                        onChange={(e) => setPrompt(e.target.value)}
                                        placeholder={isAnalyzing ? "Magic is happening..." : "Describe your image or let AI do it for you..."}
                                        disabled={isAnalyzing}
                                        className={`w-full bg-black/40 border rounded-xl p-4 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 min-h-[120px] resize-none transition-all font-light leading-relaxed ${isAnalyzing ? 'border-purple-500/30 opacity-70 cursor-wait' : 'border-white/10 hover:border-white/20'}`}
                                    />
                                    {isAnalyzing && (
                                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none bg-black/20 backdrop-blur-[1px] rounded-xl">
                                            <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mb-2" />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t border-white/5 bg-white/[0.02]">
                            <button
                                onClick={handleUpload}
                                disabled={!selectedImage || !prompt.trim() || isAnalyzing || isSharing}
                                className={`w-full py-4 rounded-xl font-semibold text-lg flex items-center justify-center gap-2 transition-all transform active:scale-[0.98] ${selectedImage && prompt.trim() && !isAnalyzing && !isSharing
                                    ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 hover:brightness-110'
                                    : 'bg-white/5 text-gray-500 cursor-not-allowed'
                                    }`}
                            >
                                {isAnalyzing ? (
                                    <>Processing...</>
                                ) : isSharing ? (
                                    <>Sharing...</>
                                ) : (
                                    <>
                                        <Upload size={20} />
                                        Share to Feed
                                    </>
                                )}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
