'use client';

import { motion } from 'framer-motion';

export default function MessageSkeleton() {
    return (
        <div className="flex flex-col gap-3 w-full min-w-[250px] max-w-[450px] p-1">
            <motion.div
                className="h-4 bg-white/10 rounded-md w-[90%]"
                animate={{ opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
                className="h-4 bg-white/10 rounded-md w-full"
                animate={{ opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
            />
            <motion.div
                className="h-4 bg-white/10 rounded-md w-[80%]"
                animate={{ opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
            />
        </div>
    );
}
