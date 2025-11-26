'use client';

import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Stars } from '@react-three/drei';
import * as THREE from 'three';

function RotatingVideoIcon() {
    const groupRef = useRef<THREE.Group>(null);

    useFrame((state) => {
        if (groupRef.current) {
            groupRef.current.rotation.y = state.clock.elapsedTime * 0.8;
            groupRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.5) * 0.2;
        }
    });

    return (
        <Float speed={3} rotationIntensity={0.8} floatIntensity={0.8}>
            <group ref={groupRef}>
                {/* Film Reel / Camera Body */}
                <mesh>
                    <boxGeometry args={[1.5, 1, 0.4]} />
                    <meshStandardMaterial
                        color="#ef4444" // Red for video
                        wireframe
                        transparent
                        opacity={0.8}
                        emissive="#ef4444"
                        emissiveIntensity={0.5}
                    />
                </mesh>

                {/* Lens */}
                <mesh position={[0, 0, 0.3]} rotation={[Math.PI / 2, 0, 0]}>
                    <cylinderGeometry args={[0.3, 0.3, 0.4, 32]} />
                    <meshStandardMaterial color="#f87171" emissive="#f87171" emissiveIntensity={0.8} transparent opacity={0.5} />
                </mesh>

                {/* Film Reels (Decorations) */}
                <mesh position={[-0.5, 0.6, 0]}>
                    <cylinderGeometry args={[0.3, 0.3, 0.1, 16]} rotation={[Math.PI / 2, 0, 0]} />
                    <meshStandardMaterial color="#b91c1c" wireframe />
                </mesh>
                <mesh position={[0.5, 0.6, 0]}>
                    <cylinderGeometry args={[0.3, 0.3, 0.1, 16]} rotation={[Math.PI / 2, 0, 0]} />
                    <meshStandardMaterial color="#b91c1c" wireframe />
                </mesh>
            </group>
        </Float>
    );
}

export default function VideoGenerationSkeleton() {
    const containerRef = useRef<HTMLDivElement>(null);

    return (
        <div ref={containerRef} className="w-full h-64 rounded-2xl overflow-hidden bg-black/40 border border-white/10 relative backdrop-blur-sm">
            <div className="absolute inset-0 flex flex-col items-center justify-end pb-6 pointer-events-none z-10">
                <span className="text-white/70 font-medium tracking-wider text-sm uppercase animate-pulse flex items-center gap-2">
                    <span className="w-2 h-2 bg-red-500 rounded-full animate-ping" />
                    Rendering Scene...
                </span>
            </div>
            <Canvas camera={{ position: [0, 0, 5], fov: 45 }}>
                <ambientLight intensity={0.5} />
                <pointLight position={[10, 10, 10]} intensity={1} color="#ef4444" />
                <pointLight position={[-10, -10, -10]} intensity={0.5} color="#3b82f6" />
                <RotatingVideoIcon />
                <Stars radius={50} depth={50} count={1000} factor={4} saturation={0} fade speed={2} />
            </Canvas>
        </div>
    );
}
