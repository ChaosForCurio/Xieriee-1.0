
'use client';
/* eslint-disable @next/next/no-img-element */

import React, { useState, useEffect, useRef } from 'react';
import { Send, Paperclip, Sparkles, Download, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp, ChatMessage } from '@/context/AppContext';
import { compressImage } from '@/lib/imageUtils';
import GeminiLogo3D from '../ui/GeminiLogo3D';
import Toggle3D from '../ui/Toggle3D';
import ImageGenerationSkeleton from '../ui/ImageGenerationSkeleton';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useUser } from "@stackframe/stack";
import StreamingAIResponse from './StreamingAIResponse';

const ImageMessage = ({ imageUrl, onDownload, showDownload = true }: { imageUrl: string, onDownload: (url: string) => void, showDownload?: boolean }) => {
    const [isLoaded, setIsLoaded] = useState(false);

    return (
        <div className="mb-3 mt-1 relative group inline-block rounded-xl overflow-hidden">
            <img
                src={imageUrl}
                alt="Generated"
                className={`max-w-full rounded-xl shadow-lg border border-white/10 transition-opacity duration-500 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
                loading="lazy"
                onLoad={() => setIsLoaded(true)}
            />
            {isLoaded && showDownload && (
                <button
                    onClick={() => onDownload(imageUrl)}
                    className="absolute bottom-2 right-2 p-2 bg-black/60 hover:bg-black/80 text-white rounded-full backdrop-blur-sm transition-all border border-white/20 shadow-lg"
                    title="Download Image"
                >
                    <Download size={20} />
                </button>
            )}
        </div>
    );
};

const PDFMessage = ({ pdfUrl }: { pdfUrl: string }) => {
    return (
        <div className="mb-3 mt-1 relative group inline-flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/10 hover:bg-white/10 transition-colors cursor-pointer" onClick={() => window.open(pdfUrl, '_blank')}>
            <div className="h-12 w-12 flex items-center justify-center bg-red-500/20 rounded-lg text-red-400">
                <FileText size={24} />
            </div>
            <div className="flex flex-col">
                <span className="text-sm font-medium text-white/90">PDF Document</span>
                <span className="text-xs text-white/50">Click to view</span>
            </div>
        </div>
    );
};

export default function ChatArea() {
    const { inputPrompt, setInputPrompt, chatHistory, addMessage, toggleLeftSidebar, toggleRightSidebar, isLeftSidebarOpen, isRightSidebarOpen, generateImage, isGeneratingImage } = useApp();
    const user = useUser();
    const [isLoading, setIsLoading] = useState(false);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.type === 'image/png' || file.type === 'image/jpeg' || file.type === 'image/jpg' || file.type === 'application/pdf') {
                const reader = new FileReader();
                reader.onloadend = async () => {
                    try {
                        const base64 = reader.result as string;

                        if (file.type === 'application/pdf') {
                            // No compression for PDFs
                            setSelectedImage(base64);
                        } else {
                            // Compress image before setting state
                            // Limit to 1600px width and 0.7 quality to avoid payload issues
                            const compressed = await compressImage(base64, 1600, 0.7);
                            setSelectedImage(compressed);
                        }
                    } catch (error) {
                        console.error("File processing failed:", error);
                        // Fallback to original if compression fails, but warn
                        console.warn("Using original file due to processing failure.");
                        setSelectedImage(reader.result as string);
                    }
                };
                reader.readAsDataURL(file);
            } else {
                alert('Please upload a PNG, JPG, or PDF file.');
            }
        }
    };

    const handleRemoveImage = () => {
        setSelectedImage(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    // Helper to remove heavy base64 data from history before sending to API
    const sanitizeHistory = (history: ChatMessage[]) => {
        return history.map(msg => {
            // Check if content contains base64 image or pdf
            if (msg.content.includes('data:image') || msg.content.includes('data:application/pdf')) {
                // Replace the base64 string with a placeholder
                // Regex to match markdown image syntax with base64: ![...](data:...)
                // or just the raw data string if it's somehow loose
                let cleanContent = msg.content.replace(/\!\[.*?\]\(data:.*?\)/g, '[Image Attachment]');
                cleanContent = cleanContent.replace(/\[PDF Attachment\]\(data:.*?\)/g, '[PDF Attachment]');
                return { ...msg, content: cleanContent };
            }
            return msg;
        });
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [chatHistory, isLoading]);

    const handleSend = async () => {
        if ((!inputPrompt.trim() && !selectedImage) || isLoading) return;

        const prompt = inputPrompt.trim();


        setInputPrompt(''); // Clear input immediately
        setSelectedImage(null); // Clear image immediately

        // Use the compressed base64 image directly (no Cloudinary upload)
        // It will be persisted in localStorage automatically
        const finalImageUrl = selectedImage;

        // Check if it's an image generation command
        if (prompt.toLowerCase().startsWith('@image ')) {
            const imageDescription = prompt.slice(7).trim(); // Remove '@image ' prefix

            if (!imageDescription) {
                addMessage('ai', 'Please provide a description for the image after @image');
                return;
            }

            // Show user image in chat history (using Cloudinary URL)
            if (finalImageUrl) {
                addMessage('user', `![User Image](${finalImageUrl}) \n${prompt} `);
            } else {
                addMessage('user', prompt);
            }
            // Add loading message with animation
            // Loading state is handled by isGeneratingImage and the skeleton component

            try {
                // Pass the Cloudinary URL (finalImageUrl) to generateImage
                const imageUrl = await generateImage(imageDescription, 'flux', finalImageUrl || undefined);
                if (imageUrl) {
                    addMessage('ai', `![Generated Image](${imageUrl})`);
                } else {
                    addMessage('ai', '❌ Image generation failed. This could be due to:\n• Invalid or missing API key\n• API endpoint issues\n• Network problems\n\nPlease check the browser console for more details.');
                }
            } catch (error) {
                console.error('Image generation error:', error);
                addMessage('ai', `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'} `);
            }
            return;
        }

        // Normal chat flow (with optional image/pdf)
        let userContent = prompt;
        if (finalImageUrl) {
            if (finalImageUrl.startsWith('data:application/pdf')) {
                userContent = `[PDF Attachment](${finalImageUrl}) \n${prompt} `;
            } else {
                // Use the Cloudinary URL (or base64 fallback) in the message
                userContent = `![User Image](${finalImageUrl}) \n${prompt} `;
            }
        }

        addMessage('user', userContent);
        setIsLoading(true);

        try {
            // Sanitize history to remove large base64 strings
            const sanitizedHistory = sanitizeHistory(chatHistory);

            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt, image: finalImageUrl, messages: sanitizedHistory }),
            });

            const contentType = res.headers.get("content-type");
            let data;
            if (contentType && contentType.indexOf("application/json") !== -1) {
                data = await res.json();
            } else {
                const text = await res.text();
                console.error("Server returned non-JSON response:", text);
                if (text.includes("Request Entity Too Large") || res.status === 413) {
                    addMessage('ai', "❌ Error: The message or attachment is too large. Please try a smaller file.");
                } else {
                    addMessage('ai', "❌ An error occurred while processing your request.");
                }
                return;
            }

            if (data.response) {
                addMessage('ai', data.response);
            } else if (!data.action) {
                // Fallback for empty Gemini response (only if no action)
                addMessage('ai', "Sorry, I couldn't get a response from Gemini. Please try again.");
            }

            // Handle Image Generation Action from AI
            if (data.action === 'generate_image' && data.freepik_prompt) {
                try {
                    // Pass the Cloudinary URL (finalImageUrl) to generateImage if available, 
                    // effectively doing Image-to-Image generation if the user provided an image.
                    const imageUrl = await generateImage(data.freepik_prompt, 'flux', finalImageUrl || undefined);

                    if (imageUrl) {
                        addMessage('ai', `![Generated Image](${imageUrl})`);
                    } else {
                        addMessage('ai', '❌ Image generation failed. Please check the console for details.');
                    }
                } catch (error) {
                    console.error('Auto-image generation error:', error);
                    addMessage('ai', `❌ Error generating image: ${error instanceof Error ? error.message : 'Unknown error'} `);
                }
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

    const handleDownload = async (url: string) => {
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = `generated - image - ${Date.now()}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(blobUrl);
        } catch (error) {
            console.error('Download failed:', error);
            window.open(url, '_blank');
        }
    };



    return (
        <div className="flex-1 flex flex-col h-full relative overflow-hidden">
            {/* Header with Toggles */}
            <div className="h-16 flex items-center justify-between px-4 border-b border-white/5 bg-black/20 backdrop-blur-md z-30 shrink-0 w-full">
                <div className="hover:bg-white/5 rounded-lg transition-colors">
                    <div className="hidden lg:block">
                        <Toggle3D type="panel" side="left" isOpen={isLeftSidebarOpen} onClick={toggleLeftSidebar} />
                    </div>
                    <button
                        onClick={toggleLeftSidebar}
                        className="lg:hidden w-10 h-10 flex items-center justify-center text-white/80 text-2xl font-light"
                    >
                        {isLeftSidebarOpen ? '<' : '>'}
                    </button>
                </div>

                <span className="font-medium text-white/80 tracking-wide">Xieriee AI</span>

                <div className="hover:bg-white/5 rounded-lg transition-colors">
                    <div className="hidden lg:block">
                        <Toggle3D type="panel" side="right" isOpen={isRightSidebarOpen} onClick={toggleRightSidebar} />
                    </div>
                    <button
                        onClick={toggleRightSidebar}
                        className="lg:hidden w-10 h-10 flex items-center justify-center text-white/80 text-2xl font-light"
                    >
                        {isRightSidebarOpen ? '>' : '<'}
                    </button>
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
                            {!user ? (
                                <>
                                    <h1 className="text-5xl md:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 pb-2">
                                        Welcome to Xieriee
                                    </h1>
                                    <p className="text-xl text-white/60 font-light">
                                        Sign in to unlock your creative potential
                                    </p>
                                    <button
                                        onClick={() => window.location.href = '/handler/sign-in'}
                                        className="mt-6 px-8 py-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white font-medium rounded-lg hover:from-purple-600 hover:to-blue-600 transition-all shadow-lg"
                                    >
                                        Sign In
                                    </button>
                                </>
                            ) : (
                                <>
                                    <h1 className="text-5xl md:text-6xl font-bold text-white pb-2">
                                        Hello, {user.displayName || 'Human'}
                                    </h1>
                                    <p className="text-xl text-white/60 font-light">
                                        What would you like to create today?
                                    </p>
                                </>
                            )}
                        </motion.div>
                    </div>
                ) : (
                    <div className="space-y-6 max-w-4xl mx-auto w-full pb-4">
                        <AnimatePresence>
                            {chatHistory.map((msg, index) => (
                                <motion.div
                                    key={msg.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                >
                                    {msg.role === 'ai' && (
                                        <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 mt-1 bg-black/20 border border-white/10">
                                            {/* Mobile/Tablet Avatar */}
                                            <img
                                                src="https://www.notebookcheck.com/fileadmin/Notebooks/News/_nc4/google-gemini_0051.jpg"
                                                alt="AI"
                                                className="w-full h-full object-cover md:hidden"
                                            />
                                            {/* Desktop Avatar */}
                                            <div className="hidden md:block w-full h-full">
                                                <GeminiLogo3D />
                                            </div>
                                        </div>
                                    )}

                                    <div className={`max-w-[80%] md:max-w-[70%] p-4 rounded-2xl ${msg.role === 'user'
                                        ? 'bg-transparent text-white rounded-tr-sm'
                                        : 'bg-transparent text-gray-100 rounded-tl-sm'
                                        } `}>
                                        {(() => {
                                            // Check for markdown image syntax
                                            const imageMatch = msg.content.match(/!\[.*?\]\((.*?)\)/);
                                            const imageUrl = imageMatch ? imageMatch[1] : null;

                                            // Check for PDF attachment syntax
                                            const pdfMatch = msg.content.match(/\[PDF Attachment\]\((.*?)\)/);
                                            const pdfUrl = pdfMatch ? pdfMatch[1] : null;

                                            // Remove the image markdown from the text to avoid double rendering
                                            // but keep the rest of the message
                                            // Remove the image/pdf markdown from the text to avoid double rendering
                                            // but keep the rest of the message
                                            let textContent = msg.content;
                                            if (imageUrl) textContent = textContent.replace(/!\[.*?\]\(.*?\)/, '');
                                            if (pdfUrl) textContent = textContent.replace(/\[PDF Attachment\]\(.*?\)/, '');
                                            textContent = textContent.trim();

                                            return (
                                                <>
                                                    {imageUrl && (
                                                        <ImageMessage
                                                            imageUrl={imageUrl}
                                                            onDownload={handleDownload}
                                                            showDownload={msg.role === 'ai'}
                                                        />
                                                    )}
                                                    {pdfUrl && (
                                                        <PDFMessage pdfUrl={pdfUrl} />
                                                    )}
                                                    {textContent && (
                                                        msg.role === 'ai' ? (
                                                            <StreamingAIResponse
                                                                content={msg.content}
                                                                isNew={index === chatHistory.length - 1 && !isLoading} // Only stream if it's the very last message and we are NOT currently loading (meaning it's done or being added)
                                                                // Actually, if isLoading is true, we are waiting for response. 
                                                                // When response arrives, isLoading becomes false, and the message is added.
                                                                // So index === length - 1 is correct.
                                                                onDownload={handleDownload}
                                                            />
                                                        ) : (
                                                            <p className="whitespace-pre-wrap leading-relaxed">{textContent}</p>
                                                        )
                                                    )}
                                                </>
                                            );
                                        })()}
                                    </div>

                                    {msg.role === 'user' && (
                                        <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 mt-1 border border-white/10 bg-gradient-to-br from-purple-500/20 to-blue-500/20">
                                            <img
                                                src={user?.profileImageUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.displayName || 'User')}&background=random&color=fff`}
                                                alt="User"
                                                className="w-full h-full object-cover"
                                                onError={(e) => {
                                                    const target = e.target as HTMLImageElement;
                                                    target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.displayName || 'User')}&background=random&color=fff`;
                                                }}
                                            />
                                        </div>
                                    )}
                                </motion.div>
                            ))}
                            {isGeneratingImage && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="flex gap-4 justify-start"
                                >
                                    <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 mt-1 bg-black/20 border border-white/10">
                                        {/* Mobile/Tablet Avatar */}
                                        <img
                                            src="https://www.notebookcheck.com/fileadmin/Notebooks/News/_nc4/google-gemini_0051.jpg"
                                            alt="AI"
                                            className="w-full h-full object-cover md:hidden"
                                        />
                                        {/* Desktop Avatar */}
                                        <div className="hidden md:block w-full h-full">
                                            <GeminiLogo3D />
                                        </div>
                                    </div>
                                    <div className="max-w-[80%] md:max-w-[60%] w-full">
                                        <ImageGenerationSkeleton />
                                    </div>
                                </motion.div>
                            )}
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
                    {/* Image Preview */}
                    <AnimatePresence>
                        {selectedImage && (
                            <motion.div
                                initial={{ opacity: 0, height: 0, padding: 0 }}
                                animate={{ opacity: 1, height: 'auto', padding: '16px' }}
                                exit={{ opacity: 0, height: 0, padding: 0 }}
                                className="px-4 pt-4"
                            >
                                <div className="relative inline-block">
                                    {selectedImage.startsWith('data:application/pdf') ? (
                                        <div className="h-20 w-20 flex flex-col items-center justify-center bg-white/10 rounded-xl border border-white/20 text-white/70">
                                            <FileText size={32} />
                                            <span className="text-[10px] mt-1 font-medium">PDF</span>
                                        </div>
                                    ) : (
                                        <img
                                            src={selectedImage}
                                            alt="Preview"
                                            className="h-20 w-auto rounded-xl border border-white/20"
                                        />
                                    )}
                                    <button
                                        onClick={handleRemoveImage}
                                        className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-lg"
                                    >
                                        <Sparkles size={12} className="rotate-45" />
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <textarea
                        value={inputPrompt}
                        onChange={(e) => setInputPrompt(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={!user ? "Please sign in to start chatting..." : "Ask anything... (type @image to generate/remix images)"}
                        disabled={!user}
                        className="w-full bg-transparent text-white placeholder-white/40 p-4 pl-6 pr-16 min-h-[60px] max-h-[200px] resize-none outline-none rounded-3xl custom-scrollbar disabled:cursor-not-allowed disabled:opacity-50"
                        rows={1}
                    />

                    <div className="flex items-center justify-between px-4 pb-3">
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={!user}
                                className="p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-30"
                            >
                                <Paperclip size={20} />
                            </button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/png, image/jpeg, image/jpg, application/pdf"
                                onChange={handleFileSelect}
                                className="hidden"
                            />
                        </div>

                        <button
                            onClick={handleSend}
                            disabled={!user || (!inputPrompt.trim() && !selectedImage) || isLoading}
                            className={`p-3 rounded-full transition-all duration-300 ${user && (inputPrompt.trim() || selectedImage) && !isLoading ? 'bg-white text-black hover:bg-gray-200' : 'bg-white/10 text-white/30 cursor-not-allowed'
                                } `}
                        >
                            <Send size={20} />
                        </button>
                    </div>
                </div>
                <p className="text-center text-xs text-white/30 mt-4">
                    Xieriee 1.0
                </p>
            </div>
        </div>
    );
}
