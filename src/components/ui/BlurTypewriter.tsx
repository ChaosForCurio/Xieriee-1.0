'use client';

import { motion, Variants } from 'framer-motion';

interface BlurTypewriterProps {
    content: string;
    className?: string;
    delay?: number;
}

export const BlurTypewriter = ({ content, className = "", delay = 0 }: BlurTypewriterProps) => {
    const words = content.split(" ");

    const container: Variants = {
        hidden: { opacity: 0 },
        visible: (i = 1) => ({
            opacity: 1,
            transition: { staggerChildren: 0.03, delayChildren: 0.04 * i + delay },
        }),
    };

    const child: Variants = {
        visible: {
            opacity: 1,
            filter: "blur(0px)",
            y: 0,
            transition: {
                type: "spring",
                damping: 12,
                stiffness: 100,
            },
        },
        hidden: {
            opacity: 0,
            filter: "blur(10px)",
            y: 5,
        },
    };

    return (
        <motion.div
            style={{ display: "inline-block", whiteSpace: "pre-wrap" }}
            variants={container}
            initial="hidden"
            animate="visible"
            className={className}
        >
            {words.map((word, index) => (
                <motion.span key={index} variants={child} className="inline-block">
                    {word}
                    {index < words.length - 1 && "\u00A0"}
                </motion.span>
            ))}
        </motion.div>
    );
};
