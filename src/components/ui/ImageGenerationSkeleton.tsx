'use client';

import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Stars } from '@react-three/drei';
import * as THREE from 'three';

function RotatingSkeleton() {
    const groupRef = useRef<THREE.Group>(null);

    useFrame((state) => {
        if (groupRef.current) {
            groupRef.current.rotation.y = state.clock.elapsedTime * 0.5;
        }
    });

    return (
        <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
            <group ref={groupRef}>
                {/* Central "Core" */}
                <mesh>
                    <octahedronGeometry args={[1, 0]} />
                    <meshStandardMaterial
                        color="#a855f7"
                        wireframe
                        transparent
                        opacity={0.8}
                        emissive="#a855f7"
                        emissiveIntensity={0.5}
                    />
                </mesh>

                {/* Outer "Ribs" / Rings */}
                <mesh rotation={[Math.PI / 4, 0, 0]}>
                    <torusGeometry args={[1.8, 0.05, 16, 100]} />
                    <meshStandardMaterial color="#3b82f6" emissive="#3b82f6" emissiveIntensity={0.8} transparent opacity={0.5} />
                </mesh>
                <mesh rotation={[-Math.PI / 4, 0, 0]}>
                    <torusGeometry args={[1.4, 0.05, 16, 100]} />
                    <meshStandardMaterial color="#ec4899" emissive="#ec4899" emissiveIntensity={0.8} transparent opacity={0.5} />
                </mesh>
            </group>
        </Float>
    );
}

export default function ImageGenerationSkeleton() {
    const containerRef = useRef<HTMLDivElement>(null);

    return (
        <div ref={containerRef} className="w-full h-64 rounded-2xl overflow-hidden bg-black/40 border border-white/10 relative backdrop-blur-sm">
            <div className="absolute inset-0 flex flex-col items-center justify-end pb-6 pointer-events-none z-10">
                <span className="text-white/70 font-medium tracking-wider text-sm uppercase animate-pulse flex items-center gap-2">
                    <span className="w-2 h-2 bg-purple-500 rounded-full animate-ping" />
                    Constructing Visuals...
                </span>
            </div>
            <Canvas camera={{ position: [0, 0, 6], fov: 45 }}>
                <ambientLight intensity={0.5} />
                <pointLight position={[10, 10, 10]} intensity={1} color="#a855f7" />
                <pointLight position={[-10, -10, -10]} intensity={0.5} color="#3b82f6" />
                <RotatingSkeleton />
                <Stars radius={50} depth={50} count={1000} factor={4} saturation={0} fade speed={1.5} />
            </Canvas>
        </div>
    );
}
