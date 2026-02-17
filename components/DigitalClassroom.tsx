import React, { useEffect, useState, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, Box, Sphere, Html } from '@react-three/drei';
import { websocketService } from '../services/websocketService';
import type { DigitalTwinState, StudentTwinData } from '../types';
import * as THREE from 'three';

interface DigitalClassroomProps {
    classroomId: string;
    students: any[];
    teacherPresent: boolean;
    activeSession: boolean;
}

// Student seat component
const StudentSeat: React.FC<{ student: StudentTwinData; index: number }> = ({ student, index }) => {
    const meshRef = useRef<THREE.Mesh>(null);

    useFrame((state) => {
        if (meshRef.current) {
            // Gentle floating animation
            meshRef.current.position.y = student.position.y + Math.sin(state.clock.elapsedTime + index) * 0.1;
        }
    });

    const getColor = () => {
        switch (student.status) {
            case 'present': return '#00C49F';
            case 'late': return '#FFBB28';
            case 'absent': return '#FF8042';
            default: return '#888888';
        }
    };

    return (
        <group position={[student.position.x, student.position.y, student.position.z]}>
            <Box ref={meshRef} args={[0.8, 0.8, 0.8]}>
                <meshStandardMaterial color={getColor()} />
            </Box>
            <Html distanceFactor={10}>
                <div className="bg-white px-2 py-1 rounded shadow-lg text-xs whitespace-nowrap pointer-events-none">
                    <div className="font-semibold">{student.name}</div>
                    <div className="text-gray-600">
                        {student.status} • {student.engagement}% engaged
                    </div>
                </div>
            </Html>
        </group>
    );
};

// Teacher position component
const TeacherPosition: React.FC<{ position: { x: number; y: number; z: number } }> = ({ position }) => {
    const meshRef = useRef<THREE.Mesh>(null);

    useFrame((state) => {
        if (meshRef.current) {
            meshRef.current.rotation.y = state.clock.elapsedTime * 0.5;
        }
    });

    return (
        <group position={[position.x, position.y, position.z]}>
            <Sphere ref={meshRef} args={[0.5, 32, 32]}>
                <meshStandardMaterial color="#4f46e5" emissive="#4f46e5" emissiveIntensity={0.5} />
            </Sphere>
            <Html distanceFactor={10}>
                <div className="bg-indigo-600 text-white px-3 py-1 rounded shadow-lg text-xs font-semibold pointer-events-none">
                    👨‍🏫 Teacher
                </div>
            </Html>
        </group>
    );
};

// Classroom floor and walls
const ClassroomStructure: React.FC = () => {
    return (
        <>
            {/* Floor */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]} receiveShadow>
                <planeGeometry args={[20, 20]} />
                <meshStandardMaterial color="#e5e7eb" />
            </mesh>

            {/* Back wall */}
            <mesh position={[0, 3, -10]}>
                <planeGeometry args={[20, 10]} />
                <meshStandardMaterial color="#f3f4f6" side={THREE.DoubleSide} />
            </mesh>

            {/* Whiteboard */}
            <mesh position={[0, 3, -9.9]}>
                <planeGeometry args={[8, 3]} />
                <meshStandardMaterial color="#ffffff" />
            </mesh>
        </>
    );
};

const DigitalClassroom: React.FC<DigitalClassroomProps> = ({
    classroomId,
    students,
    teacherPresent,
    activeSession
}) => {
    const [digitalTwinState, setDigitalTwinState] = useState<DigitalTwinState>({
        classroomId,
        students: [],
        teacher: teacherPresent ? { id: 'teacher-1', name: 'Teacher', position: { x: 0, y: 0, z: -8 }, active: true } : null,
        activeSession,
        timestamp: Date.now()
    });

    useEffect(() => {
        // Convert students to twin data
        const studentTwinData: StudentTwinData[] = students.map((student, index) => {
            const row = Math.floor(index / 5);
            const col = index % 5;
            return {
                id: student.id,
                name: student.name,
                position: {
                    x: (col - 2) * 2,
                    y: 0,
                    z: row * 2
                },
                status: student.status === 'Present' ? 'present' : 'absent',
                engagement: Math.floor(Math.random() * 40) + 60 // Mock engagement 60-100%
            };
        });

        setDigitalTwinState(prev => ({
            ...prev,
            students: studentTwinData,
            activeSession,
            timestamp: Date.now()
        }));
    }, [students, activeSession]);

    useEffect(() => {
        // Subscribe to digital twin updates
        const unsubscribe = websocketService.on('digital-twin-changed', (state: DigitalTwinState) => {
            setDigitalTwinState(state);
        });

        return () => unsubscribe();
    }, []);

    return (
        <div className="w-full h-full bg-gray-900 rounded-lg overflow-hidden">
            <div className="absolute top-4 left-4 z-10 bg-white/90 backdrop-blur px-4 py-2 rounded-lg shadow-lg">
                <h3 className="font-semibold text-gray-800">🏫 Digital Classroom</h3>
                <div className="text-sm text-gray-600 mt-1">
                    {digitalTwinState.students.filter(s => s.status === 'present').length} / {digitalTwinState.students.length} students present
                </div>
                {activeSession && (
                    <div className="mt-2 flex items-center gap-2 text-green-600 text-sm">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        Live Session Active
                    </div>
                )}
            </div>

            <div className="absolute top-4 right-4 z-10 bg-white/90 backdrop-blur px-4 py-2 rounded-lg shadow-lg">
                <div className="text-xs space-y-1">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-green-500 rounded"></div>
                        <span>Present</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                        <span>Late</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-red-500 rounded"></div>
                        <span>Absent</span>
                    </div>
                </div>
            </div>

            <Canvas shadows camera={{ position: [0, 8, 12], fov: 60 }}>
                <ambientLight intensity={0.5} />
                <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
                <pointLight position={[0, 5, 0]} intensity={0.5} />

                <ClassroomStructure />

                {/* Render students */}
                {digitalTwinState.students.map((student, index) => (
                    <StudentSeat key={student.id} student={student} index={index} />
                ))}

                {/* Render teacher if present */}
                {digitalTwinState.teacher && (
                    <TeacherPosition position={digitalTwinState.teacher.position} />
                )}

                <OrbitControls
                    enablePan={true}
                    enableZoom={true}
                    enableRotate={true}
                    minDistance={5}
                    maxDistance={25}
                    maxPolarAngle={Math.PI / 2}
                />
            </Canvas>
        </div>
    );
};

export default DigitalClassroom;
