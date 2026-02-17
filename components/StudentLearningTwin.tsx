import React, { useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Line, Text, Sphere, Html } from '@react-three/drei';
import type { LearningTwinData, SubjectPerformance } from '../types';
import * as THREE from 'three';

interface StudentLearningTwinProps {
    studentId: string;
    studentName: string;
    performanceData: any[];
}

// Subject node component
const SubjectNode: React.FC<{ subject: SubjectPerformance; index: number }> = ({ subject, index }) => {
    const meshRef = React.useRef<THREE.Mesh>(null);

    useFrame((state) => {
        if (meshRef.current) {
            meshRef.current.rotation.y = state.clock.elapsedTime * 0.3;
            meshRef.current.position.y = subject.position.y + Math.sin(state.clock.elapsedTime + index) * 0.2;
        }
    });

    const getColor = () => {
        if (subject.score >= 80) return '#00C49F';
        if (subject.score >= 60) return '#FFBB28';
        return '#FF8042';
    };

    const getTrendIcon = () => {
        if (subject.trend === 'improving') return '📈';
        if (subject.trend === 'declining') return '📉';
        return '➡️';
    };

    return (
        <group position={[subject.position.x, subject.position.y, subject.position.z]}>
            <Sphere ref={meshRef} args={[0.5, 32, 32]}>
                <meshStandardMaterial
                    color={getColor()}
                    emissive={getColor()}
                    emissiveIntensity={0.3}
                    metalness={0.5}
                    roughness={0.2}
                />
            </Sphere>
            <Html distanceFactor={8}>
                <div className="bg-white px-3 py-2 rounded-lg shadow-lg text-xs whitespace-nowrap pointer-events-none">
                    <div className="font-semibold text-gray-800">{subject.subject}</div>
                    <div className="text-gray-600 flex items-center gap-1">
                        <span>{subject.score}%</span>
                        <span>{getTrendIcon()}</span>
                    </div>
                </div>
            </Html>
        </group>
    );
};

// Connection lines between subjects
const ConnectionLines: React.FC<{ subjects: SubjectPerformance[] }> = ({ subjects }) => {
    const lines = [];
    for (let i = 0; i < subjects.length - 1; i++) {
        const start = subjects[i].position;
        const end = subjects[i + 1].position;
        lines.push(
            <Line
                key={i}
                points={[[start.x, start.y, start.z], [end.x, end.y, end.z]]}
                color="#8884d8"
                lineWidth={2}
                opacity={0.5}
            />
        );
    }
    return <>{lines}</>;
};

const StudentLearningTwin: React.FC<StudentLearningTwinProps> = ({
    studentId,
    studentName,
    performanceData
}) => {
    const [learningTwin, setLearningTwin] = useState<LearningTwinData>({
        studentId,
        subjects: [],
        learningPath: [],
        predictedOutcome: 0
    });

    useEffect(() => {
        // Convert performance data to 3D subject nodes
        const subjectMap = new Map<string, number[]>();
        performanceData.forEach(item => {
            if (!subjectMap.has(item.subject)) {
                subjectMap.set(item.subject, []);
            }
            subjectMap.get(item.subject)!.push(item.score);
        });

        const subjects: SubjectPerformance[] = Array.from(subjectMap.entries()).map(([subject, scores], index) => {
            const average = scores.reduce((a, b) => a + b, 0) / scores.length;
            const trend = scores.length > 1
                ? (scores[scores.length - 1] > scores[0] ? 'improving' : scores[scores.length - 1] < scores[0] ? 'declining' : 'stable')
                : 'stable';

            // Position subjects in a circle
            const angle = (index / subjectMap.size) * Math.PI * 2;
            const radius = 3;

            return {
                subject,
                score: Math.round(average),
                trend,
                position: {
                    x: Math.cos(angle) * radius,
                    y: (average / 100) * 2, // Height based on score
                    z: Math.sin(angle) * radius
                }
            };
        });

        const avgScore = subjects.reduce((sum, s) => sum + s.score, 0) / subjects.length;

        setLearningTwin({
            studentId,
            subjects,
            learningPath: [],
            predictedOutcome: Math.round(avgScore)
        });
    }, [performanceData, studentId]);

    return (
        <div className="w-full h-full bg-gradient-to-b from-gray-900 to-gray-800 rounded-lg overflow-hidden relative">
            <div className="absolute top-4 left-4 z-10 bg-white/90 backdrop-blur px-4 py-3 rounded-lg shadow-lg">
                <h3 className="font-semibold text-gray-800">🎓 Learning Profile</h3>
                <div className="text-sm text-gray-600 mt-1">{studentName}</div>
                <div className="mt-2 text-2xl font-bold text-indigo-600">
                    {learningTwin.predictedOutcome}%
                </div>
                <div className="text-xs text-gray-500">Overall Performance</div>
            </div>

            <div className="absolute bottom-4 left-4 z-10 bg-white/90 backdrop-blur px-4 py-2 rounded-lg shadow-lg max-w-xs">
                <div className="text-xs text-gray-700">
                    <p className="font-semibold mb-1">📊 Subject Breakdown:</p>
                    <div className="space-y-1">
                        {learningTwin.subjects.map(subject => (
                            <div key={subject.subject} className="flex items-center justify-between gap-4">
                                <span>{subject.subject}</span>
                                <span className="font-medium">{subject.score}%</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <Canvas camera={{ position: [0, 3, 8], fov: 60 }}>
                <ambientLight intensity={0.4} />
                <pointLight position={[10, 10, 10]} intensity={1} />
                <pointLight position={[-10, -10, -10]} intensity={0.5} color="#8884d8" />

                {/* Central sphere representing student */}
                <Sphere args={[0.8, 32, 32]} position={[0, 0, 0]}>
                    <meshStandardMaterial
                        color="#4f46e5"
                        emissive="#4f46e5"
                        emissiveIntensity={0.5}
                        metalness={0.8}
                        roughness={0.2}
                    />
                </Sphere>

                {/* Subject nodes */}
                {learningTwin.subjects.map((subject, index) => (
                    <SubjectNode key={subject.subject} subject={subject} index={index} />
                ))}

                {/* Connection lines */}
                <ConnectionLines subjects={learningTwin.subjects} />

                {/* Grid helper */}
                <gridHelper args={[10, 10, '#444444', '#222222']} position={[0, -2, 0]} />

                <OrbitControls
                    enablePan={true}
                    enableZoom={true}
                    enableRotate={true}
                    autoRotate={true}
                    autoRotateSpeed={0.5}
                    minDistance={3}
                    maxDistance={15}
                />
            </Canvas>
        </div>
    );
};

export default StudentLearningTwin;
