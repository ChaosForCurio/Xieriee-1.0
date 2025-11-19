'use client';

import React, { useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float } from '@react-three/drei';
import * as THREE from 'three';

interface Toggle3DProps {
    type: 'menu' | 'panel';
    side?: 'left' | 'right';
    isOpen?: boolean;
    onClick: () => void;
}

function CloseIcon({ hovered }: { hovered: boolean }) {
    const groupRef = useRef<THREE.Group>(null);

    useFrame((state) => {
        if (groupRef.current) {
            const targetRotation = hovered ? 0.5 : 0;
            groupRef.current.rotation.z = THREE.MathUtils.lerp(groupRef.current.rotation.z, targetRotation, 0.1);
            groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime) * 0.1;
        }
    });

    return (
        <group ref={groupRef}>
            <mesh rotation={[0, 0, Math.PI / 4]}>
                <boxGeometry args={[1.8, 0.3, 0.3]} />
                <meshStandardMaterial color={hovered ? "#ef4444" : "#ffffff"} emissive={hovered ? "#ef4444" : "#000000"} emissiveIntensity={0.5} />
            </mesh>
            <mesh rotation={[0, 0, -Math.PI / 4]}>
                <boxGeometry args={[1.8, 0.3, 0.3]} />
                <meshStandardMaterial color={hovered ? "#ef4444" : "#ffffff"} emissive={hovered ? "#ef4444" : "#000000"} emissiveIntensity={0.5} />
            </mesh>
        </group>
    );
}

function MenuIcon({ hovered }: { hovered: boolean }) {
    const groupRef = useRef<THREE.Group>(null);

    useFrame((state) => {
        if (groupRef.current) {
            // Gentle rotation on hover
            const targetRotation = hovered ? 0.5 : 0;
            groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, targetRotation, 0.1);
            groupRef.current.rotation.x = Math.sin(state.clock.elapsedTime) * 0.1;
        }
    });

    return (
        <group ref={groupRef}>
            {/* Top Bar */}
            <mesh position={[0, 0.6, 0]}>
                <boxGeometry args={[1.8, 0.3, 0.3]} />
                <meshStandardMaterial color={hovered ? "#a855f7" : "#ffffff"} emissive={hovered ? "#a855f7" : "#000000"} emissiveIntensity={0.5} />
            </mesh>
            {/* Middle Bar */}
            <mesh position={[0, 0, 0]}>
                <boxGeometry args={[1.8, 0.3, 0.3]} />
                <meshStandardMaterial color={hovered ? "#a855f7" : "#ffffff"} emissive={hovered ? "#a855f7" : "#000000"} emissiveIntensity={0.5} />
            </mesh>
            {/* Bottom Bar */}
            <mesh position={[0, -0.6, 0]}>
                <boxGeometry args={[1.8, 0.3, 0.3]} />
                <meshStandardMaterial color={hovered ? "#a855f7" : "#ffffff"} emissive={hovered ? "#a855f7" : "#000000"} emissiveIntensity={0.5} />
            </mesh>
        </group>
    );
}

function PanelIcon({ hovered, side = 'right' }: { hovered: boolean, side?: 'left' | 'right' }) {
    const groupRef = useRef<THREE.Group>(null);

    useFrame((state) => {
        if (groupRef.current) {
            const targetRotation = hovered ? (side === 'right' ? -0.5 : 0.5) : 0;
            groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, targetRotation, 0.1);
            groupRef.current.rotation.x = Math.sin(state.clock.elapsedTime) * 0.1;
        }
    });

    const isRight = side === 'right';

    return (
        <group ref={groupRef}>
            {/* Main Window */}
            <mesh position={[isRight ? -0.4 : 0.4, 0, 0]}>
                <boxGeometry args={[1.2, 1.6, 0.2]} />
                <meshStandardMaterial color="#ffffff" transparent opacity={0.8} />
            </mesh>
            {/* Sidebar Panel */}
            <mesh position={[isRight ? 0.6 : -0.6, 0, 0.1]}>
                <boxGeometry args={[0.6, 1.6, 0.2]} />
                <meshStandardMaterial color={hovered ? "#3b82f6" : "#a0aec0"} emissive={hovered ? "#3b82f6" : "#000000"} emissiveIntensity={0.5} />
            </mesh>
        </group>
    );
}

export default function Toggle3D({ type, side = 'right', isOpen = false, onClick }: Toggle3DProps) {
    const [hovered, setHovered] = useState(false);

    return (
        <div
            className="w-10 h-10 cursor-pointer"
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            onClick={onClick}
        >
            <Canvas camera={{ position: [0, 0, 4], fov: 50 }}>
                <ambientLight intensity={0.8} />
                <pointLight position={[10, 10, 10]} intensity={1} />
                <Float speed={2} rotationIntensity={0.2} floatIntensity={0.2}>
                    {isOpen ? (
                        <CloseIcon hovered={hovered} />
                    ) : (
                        type === 'menu' ? <MenuIcon hovered={hovered} /> : <PanelIcon hovered={hovered} side={side} />
                    )}
                </Float>
            </Canvas>
        </div>
    );
}
