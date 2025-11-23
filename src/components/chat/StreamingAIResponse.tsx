'use client';

import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { motion } from 'framer-motion';
import { Download, FileText } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// Re-using the components from ChatArea to ensure consistency
// We need to pass them or re-define them. 
// For simplicity, I'll redefine the styling wrappers here to match ChatArea.

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

interface StreamingAIResponseProps {
    content: string;
    isNew: boolean; // Only stream if it's a new message
    onDownload: (url: string) => void;
}

export default function StreamingAIResponse({ content, isNew, onDownload }: StreamingAIResponseProps) {
    // Extract images/PDFs from the content
    const imageMatch = content.match(/!\[.*?\]\((.*?)\)/);
    const imageUrl = imageMatch ? imageMatch[1] : null;

    const pdfMatch = content.match(/\[PDF Attachment\]\((.*?)\)/);
    const pdfUrl = pdfMatch ? pdfMatch[1] : null;

    let textContent = content;
    if (imageUrl) textContent = textContent.replace(/!\[.*?\]\(.*?\)/, '');
    if (pdfUrl) textContent = textContent.replace(/\[PDF Attachment\]\(.*?\)/, '');
    textContent = textContent.trim();

    return (
        <div className={`prose prose-invert max-w-none prose-p:leading-relaxed prose-pre:p-0 prose-pre:bg-transparent relative`}>
            {
                imageUrl && (
                    <ImageMessage
                        imageUrl={imageUrl}
                        onDownload={onDownload}
                        showDownload={true}
                    />
                )
            }
            {
                pdfUrl && (
                    <PDFMessage pdfUrl={pdfUrl} />
                )
            }

            {
                textContent && (
                    <motion.div
                        initial={isNew ? { filter: 'blur(10px)', opacity: 0 } : { filter: 'blur(0px)', opacity: 1 }}
                        animate={{ filter: 'blur(0px)', opacity: 1 }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                    >
                        <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                                p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                                code: ({ inline, className, children, ...props }: React.ComponentPropsWithoutRef<'code'> & { inline?: boolean }) => {
                                    const match = /language-(\w+)/.exec(className || '');
                                    return !inline && match ? (
                                        <div className="relative bg-black/50 rounded-lg p-4 my-4 overflow-x-auto border border-white/10">
                                            <code className={className} {...props}>
                                                {children}
                                            </code>
                                        </div>
                                    ) : (
                                        <code className="bg-white/10 px-1.5 py-0.5 rounded text-sm font-mono text-pink-300" {...props}>
                                            {children}
                                        </code>
                                    );
                                },
                                ul: ({ children }) => <ul className="list-disc list-outside ml-4 mb-4 space-y-1">{children}</ul>,
                                ol: ({ children }) => <ol className="list-decimal list-outside ml-4 mb-4 space-y-1">{children}</ol>,
                                li: ({ children }) => <li className="pl-1">{children}</li>,
                                h1: ({ children }) => <h1 className="text-2xl font-bold mb-4 mt-6 first:mt-0">{children}</h1>,
                                h2: ({ children }) => <h2 className="text-xl font-bold mb-3 mt-5 first:mt-0">{children}</h2>,
                                h3: ({ children }) => <h3 className="text-lg font-bold mb-2 mt-4 first:mt-0">{children}</h3>,
                                table: ({ children }) => <div className="overflow-x-auto my-4 rounded-lg border border-white/10"><table className="min-w-full divide-y divide-white/10">{children}</table></div>,
                                thead: ({ children }) => <thead className="bg-white/5">{children}</thead>,
                                th: ({ children }) => <th className="px-4 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">{children}</th>,
                                td: ({ children }) => <td className="px-4 py-3 whitespace-nowrap text-sm text-white/80 border-t border-white/5">{children}</td>,
                                blockquote: ({ children }) => <blockquote className="border-l-4 border-purple-500/50 pl-4 italic my-4 text-white/60">{children}</blockquote>,
                                blockquote: ({ children }) => <blockquote className="border-l-4 border-purple-500/50 pl-4 italic my-4 text-white/60">{children}</blockquote>,
                                a: ({ href, children }) => {
                                    if (!href) return <span className="text-blue-400">{children}</span>;

                                    let hostname = '';
                                    try {
                                        hostname = new URL(href).hostname;
                                    } catch (e) {
                                        // invalid url
                                    }

                                    return (
                                        <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-blue-400 hover:text-blue-300 underline decoration-blue-400/30 hover:decoration-blue-300 align-baseline">
                                            {hostname && (
                                                <span className="inline-block relative top-0.5 shrink-0">
                                                    <Avatar className="h-4 w-4">
                                                        <AvatarImage src={`https://www.google.com/s2/favicons?domain=${hostname}`} alt={hostname} />
                                                        <AvatarFallback className="text-[8px] bg-white/10 text-white/50">{hostname.substring(0, 1).toUpperCase()}</AvatarFallback>
                                                    </Avatar>
                                                </span>
                                            )}
                                            <span>{children}</span>
                                        </a>
                                    );
                                },
                            }}
                        >
                            {textContent}
                        </ReactMarkdown>
                    </motion.div>
                )
            }
        </div >
    );
}
