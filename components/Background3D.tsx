import React from 'react';
import { Canvas } from '@react-three/fiber';
import { Stars, Float, PerspectiveCamera } from '@react-three/drei';

const Background3D: React.FC = () => {
    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            zIndex: -1,
            pointerEvents: 'none', // Allow clicks to pass through
            background: 'linear-gradient(to bottom, #0f172a, #1e293b)' // Dark fallback/base
        }}>
            <Canvas>
                <PerspectiveCamera makeDefault position={[0, 0, 10]} />
                <ambientLight intensity={0.5} />
                <pointLight position={[10, 10, 10]} intensity={1} />

                {/* Deep field stars */}
                <Stars
                    radius={100}
                    depth={50}
                    count={5000}
                    factor={4}
                    saturation={0}
                    fade
                    speed={1}
                />

                {/* Floating "Knowledge Nodes" - Abstract representation */}
                <Float speed={2} rotationIntensity={2} floatIntensity={2}>
                    <mesh position={[2, 2, 0]}>
                        <dodecahedronGeometry args={[0.5, 0]} />
                        <meshStandardMaterial color="#6366f1" wireframe />
                    </mesh>
                    <mesh position={[-3, -2, -2]}>
                        <octahedronGeometry args={[0.8, 0]} />
                        <meshStandardMaterial color="#8b5cf6" wireframe />
                    </mesh>
                    <mesh position={[3, -3, -5]}>
                        <icosahedronGeometry args={[1, 0]} />
                        <meshStandardMaterial color="#ec4899" wireframe />
                    </mesh>
                    {/* Connective lines or particles can be added if needed, but keeping it clean for now */}
                </Float>
            </Canvas>
        </div>
    );
};

export default Background3D;
