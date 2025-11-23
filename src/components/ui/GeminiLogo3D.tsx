'use client';

import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Stars } from '@react-three/drei';
import * as THREE from 'three';

interface GeminiLogo3DProps {
    mode?: 'default' | 'searching' | 'creative';
}

function Sparkle({ mode = 'default' }: { mode?: 'default' | 'searching' | 'creative' }) {
    const meshRef = useRef<THREE.Mesh>(null);

    useFrame((state) => {
        if (meshRef.current) {
            if (mode === 'searching') {
                meshRef.current.rotation.y += 0.05; // Faster rotation for searching
                meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 2) * 0.2;
            } else if (mode === 'creative') {
                meshRef.current.rotation.y += 0.01; // Slower, artistic rotation
                meshRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
                meshRef.current.rotation.x = Math.cos(state.clock.elapsedTime * 0.3) * 0.2;
            } else {
                meshRef.current.rotation.y += 0.02;
                meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.5) * 0.2;
            }
        }
    });

    return (
        <Float speed={mode === 'searching' ? 5 : 2} rotationIntensity={0.5} floatIntensity={0.5}>
            <mesh ref={meshRef}>
                {mode === 'searching' ? (
                    <icosahedronGeometry args={[1.2, 1]} />
                ) : mode === 'creative' ? (
                    <torusKnotGeometry args={[0.8, 0.3, 100, 16]} />
                ) : (
                    <octahedronGeometry args={[1.2, 0]} />
                )}

                <meshStandardMaterial
                    color={mode === 'searching' ? "#06b6d4" : mode === 'creative' ? "#ec4899" : "#4b90ff"} // Cyan for searching, Pink for creative, Blue for default
                    emissive={mode === 'searching' ? "#0891b2" : mode === 'creative' ? "#db2777" : "#8b5cf6"}
                    emissiveIntensity={0.5}
                    roughness={0.1}
                    metalness={0.8}
                    transparent
                    opacity={0.9}
                    wireframe={mode === 'searching'} // Wireframe only for searching
                />
            </mesh>
        </Float>
    );
}

export default function GeminiLogo3D({ mode = 'default' }: GeminiLogo3DProps) {
    const containerRef = useRef<HTMLDivElement>(null);

    return (
        <div ref={containerRef} className="w-full h-full">
            <Canvas
                eventSource={containerRef as React.RefObject<HTMLElement>}
                camera={{ position: [0, 0, 4], fov: 50 }}
                gl={{ preserveDrawingBuffer: true, powerPreference: "default" }}
            >
                <ambientLight intensity={0.5} />
                <pointLight position={[10, 10, 10]} intensity={1} color={mode === 'searching' ? "#06b6d4" : "#a855f7"} />
                <pointLight position={[-10, -10, -10]} intensity={1} color="#3b82f6" />
                <Sparkle mode={mode} />
                <Stars radius={100} depth={50} count={1000} factor={4} saturation={0} fade speed={1} />
            </Canvas>
        </div>
    );
}
