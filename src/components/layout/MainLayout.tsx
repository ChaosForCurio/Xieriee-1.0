'use client';

import React from 'react';
import LeftSidebar from '../sidebar/LeftSidebar';
import RightSidebar from '../sidebar/RightSidebar';
import { useApp } from '@/context/AppContext';
import { AnimatePresence, motion } from 'framer-motion';

interface MainLayoutProps {
    children: React.ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
    const { isLeftSidebarOpen, isRightSidebarOpen, toggleLeftSidebar, toggleRightSidebar } = useApp();

    return (
        <div className="relative flex h-screen w-full bg-[#0a0a0a] text-white overflow-hidden font-sans selection:bg-purple-500/30">
            {/* Left Sidebar - User Info & History */}
            <AnimatePresence mode="wait">
                {isLeftSidebarOpen && (
                    <motion.aside
                        initial={{ x: -280, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: -280, opacity: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="absolute top-0 left-0 h-full w-[280px] flex flex-col shrink-0 z-50 overflow-hidden border-r border-white/5 shadow-2xl shadow-black/50"
                    >
                        <LeftSidebar />
                    </motion.aside>
                )}
            </AnimatePresence>

            {/* Center Panel - Chat Interface */}
            <main className="flex-1 flex flex-col relative min-w-0 z-10 bg-gradient-to-b from-black/50 to-black/20 transition-all duration-300 w-full">
                {children}
            </main>

            {/* Right Sidebar - Social/Images */}
            <AnimatePresence mode="wait">
                {isRightSidebarOpen && (
                    <motion.aside
                        initial={{ x: 320, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: 320, opacity: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="absolute top-0 right-0 h-full w-[320px] flex flex-col shrink-0 z-50 overflow-hidden border-l border-white/5 shadow-2xl shadow-black/50"
                    >
                        <RightSidebar />
                    </motion.aside>
                )}
            </AnimatePresence>

            {/* Backdrop for mobile/tablet/overlay mode */}
            <AnimatePresence>
                {(isLeftSidebarOpen || isRightSidebarOpen) && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => {
                            if (isLeftSidebarOpen) toggleLeftSidebar();
                            if (isRightSidebarOpen) toggleRightSidebar();
                        }}
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm z-40"
                    />
                )}
            </AnimatePresence>

            {/* Background Gradients/Effects */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-purple-900/20 blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-900/20 blur-[120px]" />
            </div>
        </div>
    );
}
