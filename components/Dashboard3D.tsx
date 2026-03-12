import React, { useRef, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars, Text, Float, MeshDistortMaterial, PresentationControls, Stage, Environment } from '@react-three/drei';
import * as THREE from 'three';

const FloatingSphere: React.FC<{ color: string; position: [number, number, number]; speed?: number }> = ({ color, position, speed = 1 }) => {
  const meshRef = useRef<THREE.Mesh>(null!);
  useFrame((state) => {
    const time = state.clock.getElapsedTime() * speed;
    meshRef.current.position.y = position[1] + Math.sin(time) * 0.5;
  });

  return (
    <mesh ref={meshRef} position={position}>
      <sphereGeometry args={[1, 32, 32]} />
      <MeshDistortMaterial color={color} speed={2} distort={0.4} />
    </mesh>
  );
};

const Dashboard3D: React.FC<{ theme: string; stats?: { xp: number; level: number; coins: number } }> = ({ theme, stats = { xp: 0, level: 1, coins: 0 } }) => {
  return (
    <div className="w-full h-[500px] bg-slate-900 rounded-3xl overflow-hidden relative group">
      <div className="absolute top-8 left-8 z-10 text-white pointer-events-none">
        <h2 className="text-3xl font-black tracking-tight uppercase opacity-50">Gyandeep VR</h2>
        <div className="mt-4 space-y-2">
          <p className="text-6xl font-black text-indigo-400">{stats.level}</p>
          <p className="text-sm font-bold uppercase tracking-widest text-white/50">Current Level</p>
        </div>
      </div>
      
      <div className="absolute bottom-8 right-8 z-10 flex gap-4 pointer-events-none">
        <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20">
          <p className="text-xs font-bold text-white/50 uppercase">XP</p>
          <p className="text-xl font-bold text-white">{stats.xp}</p>
        </div>
        <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20">
          <p className="text-xs font-bold text-white/50 uppercase">Coins</p>
          <p className="text-xl font-bold text-amber-400">{stats.coins}</p>
        </div>
      </div>

      <Canvas camera={{ position: [0, 0, 10], fov: 50 }}>
        <color attach="background" args={['#0f172a']} />
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <spotLight position={[-10, 10, 10]} angle={0.15} penumbra={1} />
        
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
        
        <Suspense fallback={null}>
          <PresentationControls global snap={true} rotation={[0, 0, 0]} polar={[-Math.PI / 3, Math.PI / 3]} azimuth={[-Math.PI / 1.4, Math.PI / 1.4]}>
            <Float speed={2} rotationIntensity={1} floatIntensity={1}>
              <FloatingSphere color="#6366f1" position={[0, 0, 0]} />
              
              <Text
                position={[0, 2.5, 0]}
                fontSize={0.5}
                color="white"
                font="https://fonts.gstatic.com/s/raleway/v28/1Ptxg8zYS_SKggPN4iEgvnxyumdfvvV0asphIpc.woff"
                anchorX="center"
                anchorY="middle"
              >
                Welcome to Gyandeep
              </Text>
            </Float>
          </PresentationControls>
          
          <Environment preset="city" />
        </Suspense>

        <OrbitControls enableZoom={false} autoRotate autoRotateSpeed={0.5} />
      </Canvas>
      
      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent pointer-events-none" />
    </div>
  );
};

export default Dashboard3D;
