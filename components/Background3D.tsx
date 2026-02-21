import React, { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Stars, Float, PerspectiveCamera, MeshDistortMaterial, Sphere, Box, Text3D, Center, Environment, Text } from '@react-three/drei';
import * as THREE from 'three';
import LightPillar from './LightPillar';

interface Enhanced3DBackgroundProps {
    theme?: string;
    intensity?: number;
}

// Mouse-following particles
const MouseParticles: React.FC = () => {
    const { viewport, camera } = useThree();
    const mesh = useRef<THREE.InstancedMesh>(null);
    const mouse = useRef({ x: 0, y: 0 });

    const particles = useMemo(() => {
        const temp = [];
        for (let i = 0; i < 20; i++) {
            temp.push({
                position: [0, 0, 0],
                speed: Math.random() * 0.02 + 0.01
            });
        }
        return temp;
    }, []);

    useEffect(() => {
        const handleMouseMove = (event: MouseEvent) => {
            if (typeof window !== 'undefined') {
                mouse.current.x = (event.clientX / window.innerWidth) * 2 - 1;
                mouse.current.y = -(event.clientY / window.innerHeight) * 2 + 1;
            }
        };
        if (typeof window !== 'undefined') {
            window.addEventListener('mousemove', handleMouseMove);
            return () => window.removeEventListener('mousemove', handleMouseMove);
        }
    }, []);

    useFrame((state) => {
        if (mesh.current) {
            particles.forEach((particle, i) => {
                const targetX = mouse.current.x * 10;
                const targetY = mouse.current.y * 10;
                const targetZ = -5 + Math.sin(state.clock.elapsedTime + i) * 2;

                particle.position[0] += (targetX - particle.position[0]) * particle.speed;
                particle.position[1] += (targetY - particle.position[1]) * particle.speed;
                particle.position[2] += (targetZ - particle.position[2]) * particle.speed;

                const matrix = new THREE.Matrix4();
                matrix.setPosition(particle.position[0], particle.position[1], particle.position[2]);
                mesh.current!.setMatrixAt(i, matrix);
            });
            mesh.current.instanceMatrix.needsUpdate = true;
        }
    });

    return (
        <instancedMesh ref={mesh} args={[undefined, undefined, 20]}>
            <sphereGeometry args={[0.03, 8, 8]} />
            <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.3} />
        </instancedMesh>
    );
};

// Animated floating particles
const FloatingParticles: React.FC<{ count: number }> = ({ count }) => {
    const mesh = useRef<THREE.InstancedMesh>(null);

    const particles = useMemo(() => {
        const temp = [];
        for (let i = 0; i < count; i++) {
            temp.push({
                position: [
                    (Math.random() - 0.5) * 50,
                    (Math.random() - 0.5) * 50,
                    (Math.random() - 0.5) * 50
                ],
                speed: Math.random() * 0.5 + 0.1
            });
        }
        return temp;
    }, [count]);

    useFrame((state) => {
        if (mesh.current) {
            particles.forEach((particle, i) => {
                const t = state.clock.elapsedTime * particle.speed;
                const matrix = new THREE.Matrix4();
                matrix.setPosition(
                    particle.position[0] + Math.sin(t) * 2,
                    particle.position[1] + Math.cos(t) * 2,
                    particle.position[2]
                );
                mesh.current!.setMatrixAt(i, matrix);
            });
            mesh.current.instanceMatrix.needsUpdate = true;
        }
    });

    return (
        <instancedMesh ref={mesh} args={[undefined, undefined, count]}>
            <sphereGeometry args={[0.05, 8, 8]} />
            <meshStandardMaterial color="#8b5cf6" emissive="#8b5cf6" emissiveIntensity={0.5} />
        </instancedMesh>
    );
};

// Educational-themed floating objects
const EducationalObjects: React.FC<{ colors: string[] }> = ({ colors }) => {
    const book1Ref = useRef<THREE.Group>(null);
    const book2Ref = useRef<THREE.Group>(null);
    const dnaRef = useRef<THREE.Group>(null);

    useFrame((state) => {
        // Animate opening/closing books
        if (book1Ref.current) {
            const openAngle = Math.sin(state.clock.elapsedTime * 0.5) * 0.3;
            book1Ref.current.rotation.y = openAngle;
        }
        if (book2Ref.current) {
            const openAngle = Math.sin(state.clock.elapsedTime * 0.7 + Math.PI) * 0.4;
            book2Ref.current.rotation.y = openAngle;
        }
        // Animate DNA helix rotation
        if (dnaRef.current) {
            dnaRef.current.rotation.y = state.clock.elapsedTime * 0.2;
            dnaRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.3) * 0.1;
        }
    });

    return (
        <group>
            {/* Floating Books that open/close */}
            <Float speed={1.2} rotationIntensity={0.3} floatIntensity={1.5}>
                <group ref={book1Ref} position={[-8, 3, -8]}>
                    {/* Book spine */}
                    <mesh position={[0, 0, 0]}>
                        <boxGeometry args={[0.2, 1.5, 1]} />
                        <meshStandardMaterial color="#8B4513" />
                    </mesh>
                    {/* Book cover left */}
                    <mesh position={[-0.6, 0, 0]}>
                        <boxGeometry args={[0.1, 1.4, 0.9]} />
                        <meshStandardMaterial color={colors[0]} />
                    </mesh>
                    {/* Book cover right */}
                    <mesh position={[0.6, 0, 0]}>
                        <boxGeometry args={[0.1, 1.4, 0.9]} />
                        <meshStandardMaterial color={colors[0]} />
                    </mesh>
                    {/* Book pages */}
                    <mesh position={[0, 0, 0]}>
                        <boxGeometry args={[0.15, 1.3, 0.8]} />
                        <meshStandardMaterial color="#F5F5DC" />
                    </mesh>
                </group>
            </Float>

            <Float speed={1.5} rotationIntensity={0.4} floatIntensity={1.2}>
                <group ref={book2Ref} position={[6, -2, -10]}>
                    {/* Book spine */}
                    <mesh position={[0, 0, 0]}>
                        <boxGeometry args={[0.15, 1.2, 0.8]} />
                        <meshStandardMaterial color="#654321" />
                    </mesh>
                    {/* Book cover left */}
                    <mesh position={[-0.5, 0, 0]}>
                        <boxGeometry args={[0.08, 1.1, 0.7]} />
                        <meshStandardMaterial color={colors[1]} />
                    </mesh>
                    {/* Book cover right */}
                    <mesh position={[0.5, 0, 0]}>
                        <boxGeometry args={[0.08, 1.1, 0.7]} />
                        <meshStandardMaterial color={colors[1]} />
                    </mesh>
                    {/* Book pages */}
                    <mesh position={[0, 0, 0]}>
                        <boxGeometry args={[0.12, 1.0, 0.6]} />
                        <meshStandardMaterial color="#F5F5DC" />
                    </mesh>
                </group>
            </Float>

            {/* Rotating Gears - Learning Mechanics */}
            <Float speed={0.8} rotationIntensity={0.2} floatIntensity={0.8}>
                <group position={[4, 5, -12]}>
                    {/* Large gear */}
                    <mesh rotation={[0, 0, Math.PI / 4]}>
                        <cylinderGeometry args={[1.2, 1.2, 0.3, 12]} />
                        <meshStandardMaterial color={colors[2]} wireframe />
                    </mesh>
                    <mesh>
                        <cylinderGeometry args={[0.4, 0.4, 0.4, 12]} />
                        <meshStandardMaterial color={colors[2]} />
                    </mesh>
                    {/* Teeth */}
                    {Array.from({ length: 12 }, (_, i) => (
                        <mesh key={i} position={[
                            Math.cos((i / 12) * Math.PI * 2) * 1.1,
                            Math.sin((i / 12) * Math.PI * 2) * 1.1,
                            0
                        ]}>
                            <boxGeometry args={[0.1, 0.1, 0.2]} />
                            <meshStandardMaterial color={colors[2]} />
                        </mesh>
                    ))}
                </group>
            </Float>

            <Float speed={1.0} rotationIntensity={0.3} floatIntensity={1.0}>
                <group position={[-5, -4, -15]}>
                    {/* Medium gear */}
                    <mesh rotation={[0, 0, -Math.PI / 6]}>
                        <cylinderGeometry args={[0.9, 0.9, 0.2, 10]} />
                        <meshStandardMaterial color={colors[0]} wireframe />
                    </mesh>
                    <mesh>
                        <cylinderGeometry args={[0.3, 0.3, 0.3, 10]} />
                        <meshStandardMaterial color={colors[0]} />
                    </mesh>
                    {/* Teeth */}
                    {Array.from({ length: 10 }, (_, i) => (
                        <mesh key={i} position={[
                            Math.cos((i / 10) * Math.PI * 2) * 0.8,
                            Math.sin((i / 10) * Math.PI * 2) * 0.8,
                            0
                        ]}>
                            <boxGeometry args={[0.08, 0.08, 0.15]} />
                            <meshStandardMaterial color={colors[0]} />
                        </mesh>
                    ))}
                </group>
            </Float>

            {/* DNA Helix Structure */}
            <Float speed={0.5} rotationIntensity={0.1} floatIntensity={0.8}>
                <group ref={dnaRef} position={[8, 0, -18]}>
                    {/* DNA strands */}
                    {Array.from({ length: 20 }, (_, i) => {
                        const angle = (i / 20) * Math.PI * 4; // Two full turns
                        const radius = 0.3;
                        const height = (i / 20) * 3 - 1.5;
                        return (
                            <group key={i}>
                                {/* Left strand */}
                                <mesh position={[
                                    Math.cos(angle) * radius,
                                    height,
                                    Math.sin(angle) * radius
                                ]}>
                                    <sphereGeometry args={[0.05, 8, 8]} />
                                    <meshStandardMaterial color="#FF6B6B" emissive="#FF6B6B" emissiveIntensity={0.3} />
                                </mesh>
                                {/* Right strand */}
                                <mesh position={[
                                    Math.cos(angle + Math.PI) * radius,
                                    height,
                                    Math.sin(angle + Math.PI) * radius
                                ]}>
                                    <sphereGeometry args={[0.05, 8, 8]} />
                                    <meshStandardMaterial color="#4ECDC4" emissive="#4ECDC4" emissiveIntensity={0.3} />
                                </mesh>
                                {/* Connecting base pairs */}
                                <mesh position={[
                                    0,
                                    height,
                                    0
                                ]} rotation={[0, angle, 0]}>
                                    <boxGeometry args={[radius * 2, 0.02, 0.02]} />
                                    <meshStandardMaterial color="#95E1D3" emissive="#95E1D3" emissiveIntensity={0.2} />
                                </mesh>
                            </group>
                        );
                    })}
                </group>
            </Float>

            {/* Mathematical Symbols */}
            <Float speed={1.8} rotationIntensity={0.5} floatIntensity={2}>
                <Text
                    position={[2, 6, -6]}
                    fontSize={0.5}
                    color={colors[1]}
                    anchorX="center"
                    anchorY="middle"
                >
                    π
                </Text>
            </Float>

            <Float speed={1.3} rotationIntensity={0.4} floatIntensity={1.8}>
                <Text
                    position={[-3, -6, -8]}
                    fontSize={0.4}
                    color={colors[2]}
                    anchorX="center"
                    anchorY="middle"
                >
                    ∞
                </Text>
            </Float>

            <Float speed={2.1} rotationIntensity={0.6} floatIntensity={1.5}>
                <Text
                    position={[0, 8, -4]}
                    fontSize={0.3}
                    color={colors[0]}
                    anchorX="center"
                    anchorY="middle"
                >
                    ∑
                </Text>
            </Float>

            <Float speed={1.6} rotationIntensity={0.3} floatIntensity={1.3}>
                <Text
                    position={[-6, 2, -12]}
                    fontSize={0.4}
                    color={colors[1]}
                    anchorX="center"
                    anchorY="middle"
                >
                    √
                </Text>
            </Float>
        </group>
    );
};

// Knowledge Tree - central thematic element
const KnowledgeTree: React.FC<{ colors: string[] }> = ({ colors }) => {
    const treeRef = useRef<THREE.Group>(null);

    useFrame((state) => {
        if (treeRef.current) {
            treeRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.1) * 0.1;
        }
    });

    return (
        <group ref={treeRef} position={[0, -8, -20]}>
            {/* Trunk */}
            <mesh position={[0, 2, 0]}>
                <cylinderGeometry args={[0.3, 0.5, 4, 8]} />
                <meshStandardMaterial color="#8B4513" />
            </mesh>

            {/* Branches */}
            <mesh position={[1, 3, 0]} rotation={[0, 0, Math.PI / 6]}>
                <cylinderGeometry args={[0.15, 0.2, 2, 6]} />
                <meshStandardMaterial color="#654321" />
            </mesh>
            <mesh position={[-1, 3.5, 0]} rotation={[0, 0, -Math.PI / 4]}>
                <cylinderGeometry args={[0.12, 0.18, 1.5, 6]} />
                <meshStandardMaterial color="#654321" />
            </mesh>

            {/* Leaves/Fruits representing knowledge */}
            <Float speed={1.5} rotationIntensity={0.5} floatIntensity={1}>
                <mesh position={[1.5, 4, 0]}>
                    <sphereGeometry args={[0.3, 8, 8]} />
                    <meshStandardMaterial color={colors[0]} emissive={colors[0]} emissiveIntensity={0.2} />
                </mesh>
            </Float>
            <Float speed={1.8} rotationIntensity={0.3} floatIntensity={1.2}>
                <mesh position={[-1.2, 4.5, 0]}>
                    <sphereGeometry args={[0.25, 8, 8]} />
                    <meshStandardMaterial color={colors[1]} emissive={colors[1]} emissiveIntensity={0.2} />
                </mesh>
            </Float>
            <Float speed={2.0} rotationIntensity={0.4} floatIntensity={0.8}>
                <mesh position={[0.8, 5, 0]}>
                    <sphereGeometry args={[0.2, 8, 8]} />
                    <meshStandardMaterial color={colors[2]} emissive={colors[2]} emissiveIntensity={0.2} />
                </mesh>
            </Float>
        </group>
    );
};

// Animated data streams
const DataStream: React.FC<{ start: [number, number, number]; end: [number, number, number] }> = ({ start, end }) => {
    const points = useMemo(() => {
        const curve = new THREE.CatmullRomCurve3([
            new THREE.Vector3(...start),
            new THREE.Vector3(
                (start[0] + end[0]) / 2 + Math.random() * 2,
                (start[1] + end[1]) / 2 + Math.random() * 2,
                (start[2] + end[2]) / 2
            ),
            new THREE.Vector3(...end)
        ]);
        return curve.getPoints(50);
    }, [start, end]);

    const lineRef = useRef<THREE.Line>(null);

    useFrame((state) => {
        if (lineRef.current) {
            const material = lineRef.current.material as THREE.LineBasicMaterial;
            material.opacity = (Math.sin(state.clock.elapsedTime * 2) + 1) / 4 + 0.3;
        }
    });

    return (
        <mesh>
            <bufferGeometry>
                <bufferAttribute
                    attach="attributes-position"
                    count={points.length}
                    array={new Float32Array(points.flatMap(p => [p.x, p.y, p.z]))}
                    itemSize={3}
                />
            </bufferGeometry>
            <lineBasicMaterial color="#00C49F" transparent opacity={0.5} />
        </mesh>
    );
};

// Animated wave plane
const WavePlane: React.FC<{ color: string }> = ({ color }) => {
    const meshRef = useRef<THREE.Mesh>(null);

    useFrame((state) => {
        if (meshRef.current) {
            const geometry = meshRef.current.geometry as THREE.PlaneGeometry;
            const positions = geometry.attributes.position.array as Float32Array;
            for (let i = 0; i < positions.length; i += 3) {
                const x = positions[i];
                const y = positions[i + 1];
                positions[i + 2] = Math.sin(x * 0.5 + state.clock.elapsedTime) * Math.cos(y * 0.5 + state.clock.elapsedTime) * 0.5;
            }
            geometry.attributes.position.needsUpdate = true;
        }
    });

    return (
        <mesh ref={meshRef} position={[0, -5, -20]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[30, 30, 20, 20]} />
            <meshStandardMaterial
                color={color}
                wireframe
                transparent
                opacity={0.3}
            />
        </mesh>
    );
};

// Knowledge Node - interactive floating spheres
const KnowledgeNode: React.FC<{ position: [number, number, number]; color: string; index: number }> = ({ position, color, index }) => {
    const meshRef = useRef<THREE.Mesh>(null);

    useFrame((state) => {
        if (meshRef.current) {
            meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime + index) * 0.5;
            meshRef.current.rotation.y = Math.cos(state.clock.elapsedTime + index) * 0.5;
            meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 2 + index) * 0.3;
        }
    });

    return (
        <Float speed={1.5} rotationIntensity={0.5} floatIntensity={1}>
            <mesh ref={meshRef} position={position}>
                <sphereGeometry args={[0.3, 16, 16]} />
                <meshStandardMaterial
                    color={color}
                    emissive={color}
                    emissiveIntensity={0.3}
                    transparent
                    opacity={0.8}
                />
            </mesh>
        </Float>
    );
};

// Grid plane for depth
const GridPlane: React.FC = () => {
    const meshRef = useRef<THREE.Mesh>(null);

    useFrame((state) => {
        if (meshRef.current) {
            meshRef.current.rotation.z = state.clock.elapsedTime * 0.1;
        }
    });

    return (
        <mesh ref={meshRef} position={[0, -8, -25]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[50, 50, 20, 20]} />
            <meshBasicMaterial
                color="#1a1a2e"
                wireframe
                transparent
                opacity={0.1}
            />
        </mesh>
    );
};

// Full-screen liquid/chrome shader background
const LiquidChrome: React.FC<{ colors: string[] }> = ({ colors }) => {
    const meshRef = useRef<THREE.Mesh>(null);
    const materialRef = useRef<any>(null);

    const uniforms = useMemo(() => ({
        u_time: { value: 0 },
        u_resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
        u_colorA: { value: new THREE.Color(colors[0]) },
        u_colorB: { value: new THREE.Color(colors[1]) },
    }), [colors]);

    useEffect(() => {
        const onResize = () => {
            if (uniforms.u_resolution) uniforms.u_resolution.value.set(window.innerWidth, window.innerHeight);
        };
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, [uniforms]);

    useFrame((state) => {
        if (materialRef.current) {
            materialRef.current.uniforms.u_time.value = state.clock.elapsedTime;
        }
    });

    const vertex = `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `;

    // Simple liquid/chrome-like fragment shader using sin-based noise
    const fragment = `
        precision highp float;
        uniform float u_time;
        uniform vec2 u_resolution;
        uniform vec3 u_colorA;
        uniform vec3 u_colorB;
        varying vec2 vUv;

        float hash(vec2 p) {
            return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453123);
        }

        float noise(vec2 p) {
            vec2 i = floor(p);
            vec2 f = fract(p);
            float a = hash(i);
            float b = hash(i + vec2(1.0, 0.0));
            float c = hash(i + vec2(0.0, 1.0));
            float d = hash(i + vec2(1.0, 1.0));
            vec2 u = f*f*(3.0-2.0*f);
            return mix(a, b, u.x) + (c - a)*u.y*(1.0 - u.x) + (d - b)*u.x*u.y;
        }

        void main(){
            vec2 uv = vUv * vec2(u_resolution.x/u_resolution.y, 1.0);
            float t = u_time * 0.2;
            float n = 0.0;
            n += 0.6 * noise(uv * 3.0 + vec2(t, t*0.7));
            n += 0.3 * noise(uv * 6.0 - vec2(t*1.5, t*0.5));
            n *= 1.0;

            // bands and metallic highlights
            float bands = sin((uv.x + uv.y*0.3 + n*0.8) * 6.0 + t*2.0);
            float metallic = smoothstep(0.1, 0.6, bands);

            vec3 base = mix(u_colorA, u_colorB, n);
            vec3 spec = vec3(1.0) * pow(max(0.0, bands), 6.0) * 0.9;
            vec3 color = mix(base, vec3(0.95), metallic * 0.6) + spec * metallic;

            // vignette
            float dist = distance(vUv, vec2(0.5));
            color *= smoothstep(0.9, 0.2, dist);

            gl_FragColor = vec4(color, 1.0 - smoothstep(0.0, 0.8, dist));
        }
    `;

    return (
        <mesh ref={meshRef} position={[0, 0, -30]}>
            <planeGeometry args={[80, 80, 1, 1]} />
            <shaderMaterial
                ref={materialRef}
                uniforms={uniforms}
                vertexShader={vertex}
                fragmentShader={fragment}
                transparent={true}
                depthWrite={false}
            />
        </mesh>
    );
};

// Orbiting geometric shapes
const OrbitingShapes: React.FC<{ colors: string[] }> = ({ colors }) => {
    const groupRef = useRef<THREE.Group>(null);

    useFrame((state) => {
        if (groupRef.current) {
            groupRef.current.rotation.y = state.clock.elapsedTime * 0.2;
            groupRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.1) * 0.1;
        }
    });

    return (
        <group ref={groupRef}>
            {colors.map((color, index) => (
                <Float key={index} speed={1 + index * 0.5} rotationIntensity={0.5} floatIntensity={1}>
                    <mesh position={[
                        Math.cos(index * Math.PI * 2 / colors.length) * 8,
                        Math.sin(index * Math.PI * 2 / colors.length) * 8,
                        -10 + index * 2
                    ]}>
                        {index % 4 === 0 && <boxGeometry args={[1, 1, 1]} />}
                        {index % 4 === 1 && <octahedronGeometry args={[1, 0]} />}
                        {index % 4 === 2 && <tetrahedronGeometry args={[1, 0]} />}
                        {index % 4 === 3 && <icosahedronGeometry args={[1, 0]} />}
                        <meshStandardMaterial
                            color={color}
                            wireframe
                            transparent
                            opacity={0.7}
                        />
                    </mesh>
                </Float>
            ))}
        </group>
    );
};

const Enhanced3DBackground: React.FC<Enhanced3DBackgroundProps> = ({
    theme = 'indigo',
    intensity = 1
}) => {
    const [dynamicTheme, setDynamicTheme] = useState(theme);
    const [isMobile, setIsMobile] = useState(false);

    // Check for mobile device
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Dynamic color cycling
    useEffect(() => {
        const interval = setInterval(() => {
            const themes = ['indigo', 'teal', 'crimson', 'purple'];
            const currentIndex = themes.indexOf(dynamicTheme);
            const nextIndex = (currentIndex + 1) % themes.length;
            setDynamicTheme(themes[nextIndex]);
        }, 30000); // Change every 30 seconds

        return () => clearInterval(interval);
    }, [dynamicTheme]);

    const themeColors = {
        indigo: ['#6366f1', '#8b5cf6', '#ec4899'],
        teal: ['#14b8a6', '#06b6d4', '#0ea5e9'],
        crimson: ['#dc2626', '#f97316', '#eab308'],
        purple: ['#9333ea', '#a855f7', '#c026d3']
    };

    const colors = themeColors[dynamicTheme as keyof typeof themeColors] || themeColors.indigo;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            zIndex: -1,
            pointerEvents: 'none',
            background: 'radial-gradient(ellipse at bottom, #1e293b 0%, #0f172a 100%)'
        }}>
            <LightPillar />
            <Canvas>
                <PerspectiveCamera makeDefault position={[0, 0, 15]} fov={75} />

                {/* Fog for atmosphere */}
                <fog attach="fog" args={['#1e293b', 10, 50]} />

                {/* Lighting */}
                <ambientLight intensity={0.3 * intensity} />
                <pointLight position={[10, 10, 10]} intensity={1 * intensity} color={colors[0]} />
                <pointLight position={[-10, -10, -10]} intensity={0.5 * intensity} color={colors[1]} />
                <spotLight position={[0, 20, 0]} intensity={0.8 * intensity} angle={0.3} penumbra={1} color={colors[2]} />

                {/* Environment for reflections */}
                <Environment preset="night" />
                {/* Liquid/chrome shader background (behind everything) */}
                <LiquidChrome colors={colors} />

                {/* Deep field stars */}
                <Stars
                    radius={100}
                    depth={50}
                    count={7000}
                    factor={5}
                    saturation={0}
                    fade
                    speed={1}
                />

                {/* Mouse-following particles */}
                <MouseParticles />

                {/* Floating particles - reduced count for performance */}
                <FloatingParticles count={isMobile ? 50 : 100} />

                {/* Educational objects */}
                <EducationalObjects colors={colors} />

                {/* Knowledge Tree */}
                <KnowledgeTree colors={colors} />

                {/* Knowledge nodes */}
                <KnowledgeNode position={[3, 2, -5]} color={colors[0]} index={0} />
                <KnowledgeNode position={[-4, -1, -8]} color={colors[1]} index={1} />
                <KnowledgeNode position={[5, -3, -10]} color={colors[2]} index={2} />
                <KnowledgeNode position={[-3, 4, -6]} color={colors[0]} index={3} />
                <KnowledgeNode position={[2, -4, -12]} color={colors[1]} index={4} />

                {/* Data streams connecting nodes */}
                <DataStream start={[3, 2, -5]} end={[-4, -1, -8]} />
                <DataStream start={[-4, -1, -8]} end={[5, -3, -10]} />
                <DataStream start={[5, -3, -10]} end={[-3, 4, -6]} />
                <DataStream start={[-3, 4, -6]} end={[2, -4, -12]} />

                {/* Rotating grid plane */}
                <GridPlane />

                {/* Orbiting geometric shapes */}
                <OrbitingShapes colors={colors} />

                {/* Animated wave plane */}
                <WavePlane color={colors[0]} />

                {/* Additional geometric shapes */}
                <Float speed={1.5} rotationIntensity={0.5} floatIntensity={1}>
                    <mesh position={[-6, 3, -15]}>
                        <octahedronGeometry args={[1.2, 0]} />
                        <meshStandardMaterial
                            color={colors[1]}
                            wireframe
                            transparent
                            opacity={0.6}
                        />
                    </mesh>
                </Float>

                <Float speed={1.8} rotationIntensity={0.8} floatIntensity={1.5}>
                    <mesh position={[7, -2, -18]}>
                        <icosahedronGeometry args={[1.5, 0]} />
                        <meshStandardMaterial
                            color={colors[2]}
                            wireframe
                            transparent
                            opacity={0.5}
                        />
                    </mesh>
                </Float>
            </Canvas>
        </div>
    );
};

export default Enhanced3DBackground;
