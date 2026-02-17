import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import RealtimeAnalytics from './RealtimeAnalytics';
import DigitalClassroom from './DigitalClassroom';
import StudentLearningTwin from './StudentLearningTwin';
import BlockchainWallet from './BlockchainWallet';
import EngagementMetrics from './EngagementMetrics';
import type { AnyUser, Student } from '../types';

interface Dashboard3DProps {
    currentUser: AnyUser;
    students: Student[];
    theme: string;
    classSession: any;
}

type ViewMode = 'analytics' | 'classroom' | 'learning' | 'blockchain' | 'overview';

const Dashboard3D: React.FC<Dashboard3DProps> = ({
    currentUser,
    students,
    theme,
    classSession
}) => {
    const [viewMode, setViewMode] = useState<ViewMode>('overview');
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

    const navigationItems = [
        { id: 'overview', label: '🏠 Overview', icon: '🏠' },
        { id: 'analytics', label: '📊 Analytics', icon: '📊' },
        { id: 'classroom', label: '🏫 3D Classroom', icon: '🏫' },
        { id: 'learning', label: '🎓 Learning Twin', icon: '🎓' },
        { id: 'blockchain', label: '⛓️ Blockchain', icon: '⛓️' }
    ];

    return (
        <div className="relative min-h-screen overflow-hidden">
            {/* 3D Navigation Bar */}
            <motion.nav
                initial={{ y: -100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="fixed top-0 left-0 right-0 z-50 backdrop-blur-lg bg-gray-900/80 border-b border-gray-700/50"
            >
                <div className="container mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <motion.div
                                whileHover={{ scale: 1.1, rotate: 360 }}
                                transition={{ duration: 0.5 }}
                                className="text-3xl"
                            >
                                🎓
                            </motion.div>
                            <div>
                                <h1 className="text-2xl font-bold text-white">Gyandeep 3D</h1>
                                <p className="text-sm text-gray-400">Advanced Learning Platform</p>
                            </div>
                        </div>

                        {/* Navigation Pills */}
                        <div className="flex gap-2">
                            {navigationItems.map((item) => (
                                <motion.button
                                    key={item.id}
                                    onClick={() => setViewMode(item.id as ViewMode)}
                                    className={`px-4 py-2 rounded-lg font-medium transition-all ${viewMode === item.id
                                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/50'
                                            : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/50'
                                        }`}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    <span className="mr-2">{item.icon}</span>
                                    {item.label}
                                </motion.button>
                            ))}
                        </div>

                        {/* User Info */}
                        <div className="flex items-center gap-3">
                            <div className="text-right">
                                <div className="text-sm font-medium text-white">{currentUser.name}</div>
                                <div className="text-xs text-gray-400 capitalize">{currentUser.role}</div>
                            </div>
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold">
                                {currentUser.name.charAt(0)}
                            </div>
                        </div>
                    </div>
                </div>
            </motion.nav>

            {/* Main Content Area */}
            <div className="pt-24 px-6 pb-6">
                <AnimatePresence mode="wait">
                    {viewMode === 'overview' && (
                        <motion.div
                            key="overview"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
                        >
                            {/* Quick Stats Cards */}
                            <motion.div
                                whileHover={{ scale: 1.02 }}
                                className="bg-gradient-to-br from-indigo-500/20 to-purple-600/20 backdrop-blur-lg rounded-2xl p-6 border border-indigo-500/30"
                            >
                                <h3 className="text-xl font-bold text-white mb-4">📊 Quick Analytics</h3>
                                <div className="h-64">
                                    <RealtimeAnalytics
                                        userId={currentUser.id}
                                        userRole={currentUser.role as any}
                                        theme={theme}
                                    />
                                </div>
                            </motion.div>

                            <motion.div
                                whileHover={{ scale: 1.02 }}
                                className="bg-gradient-to-br from-green-500/20 to-teal-600/20 backdrop-blur-lg rounded-2xl p-6 border border-green-500/30"
                            >
                                <h3 className="text-xl font-bold text-white mb-4">🎯 Engagement</h3>
                                <EngagementMetrics
                                    userId={currentUser.id}
                                    sessionCode={classSession?.code}
                                />
                            </motion.div>

                            <motion.div
                                whileHover={{ scale: 1.02 }}
                                className="bg-gradient-to-br from-blue-500/20 to-cyan-600/20 backdrop-blur-lg rounded-2xl p-6 border border-blue-500/30 lg:col-span-2"
                            >
                                <h3 className="text-xl font-bold text-white mb-4">🏫 Virtual Classroom Preview</h3>
                                <div className="h-96">
                                    <DigitalClassroom
                                        classroomId="main-classroom"
                                        students={students}
                                        teacherPresent={true}
                                        activeSession={classSession?.code !== null}
                                    />
                                </div>
                            </motion.div>
                        </motion.div>
                    )}

                    {viewMode === 'analytics' && (
                        <motion.div
                            key="analytics"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-gradient-to-br from-gray-900/90 to-gray-800/90 backdrop-blur-xl rounded-2xl p-8 border border-gray-700/50"
                        >
                            <h2 className="text-3xl font-bold text-white mb-6">📊 Real-Time Analytics Dashboard</h2>
                            <RealtimeAnalytics
                                userId={currentUser.id}
                                userRole={currentUser.role as any}
                                theme={theme}
                            />
                        </motion.div>
                    )}

                    {viewMode === 'classroom' && (
                        <motion.div
                            key="classroom"
                            initial={{ opacity: 0, rotateY: -90 }}
                            animate={{ opacity: 1, rotateY: 0 }}
                            exit={{ opacity: 0, rotateY: 90 }}
                            className="bg-gradient-to-br from-gray-900/90 to-gray-800/90 backdrop-blur-xl rounded-2xl p-8 border border-gray-700/50"
                        >
                            <h2 className="text-3xl font-bold text-white mb-6">🏫 3D Virtual Classroom</h2>
                            <div className="h-[600px]">
                                <DigitalClassroom
                                    classroomId="main-classroom"
                                    students={students}
                                    teacherPresent={true}
                                    activeSession={classSession?.code !== null}
                                />
                            </div>
                        </motion.div>
                    )}

                    {viewMode === 'learning' && (
                        <motion.div
                            key="learning"
                            initial={{ opacity: 0, x: 100 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -100 }}
                            className="bg-gradient-to-br from-gray-900/90 to-gray-800/90 backdrop-blur-xl rounded-2xl p-8 border border-gray-700/50"
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-3xl font-bold text-white">🎓 Learning Profile</h2>
                                {currentUser.role === 'teacher' && (
                                    <select
                                        onChange={(e) => {
                                            const student = students.find(s => s.id === e.target.value);
                                            setSelectedStudent(student || null);
                                        }}
                                        className="px-4 py-2 bg-gray-800 text-white rounded-lg border border-gray-700"
                                    >
                                        <option value="">Select Student</option>
                                        {students.map(student => (
                                            <option key={student.id} value={student.id}>{student.name}</option>
                                        ))}
                                    </select>
                                )}
                            </div>
                            <div className="h-[600px]">
                                <StudentLearningTwin
                                    studentId={selectedStudent?.id || currentUser.id}
                                    studentName={selectedStudent?.name || currentUser.name}
                                    performanceData={[]} // Would be fetched from backend
                                />
                            </div>
                        </motion.div>
                    )}

                    {viewMode === 'blockchain' && (
                        <motion.div
                            key="blockchain"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            className="max-w-4xl mx-auto"
                        >
                            <h2 className="text-3xl font-bold text-white mb-6">⛓️ Blockchain Integration</h2>
                            <div className="grid grid-cols-1 gap-6">
                                <BlockchainWallet
                                    onWalletConnected={(wallet) => console.log('Wallet connected:', wallet)}
                                />

                                <motion.div
                                    whileHover={{ scale: 1.02 }}
                                    className="bg-gradient-to-br from-gray-900/90 to-gray-800/90 backdrop-blur-xl rounded-2xl p-6 border border-gray-700/50"
                                >
                                    <h3 className="text-xl font-bold text-white mb-4">📜 Blockchain Features</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="p-4 bg-indigo-500/10 rounded-lg border border-indigo-500/30">
                                            <div className="text-3xl mb-2">✅</div>
                                            <h4 className="font-semibold text-white mb-1">Attendance Records</h4>
                                            <p className="text-sm text-gray-400">Immutable on-chain attendance tracking</p>
                                        </div>
                                        <div className="p-4 bg-purple-500/10 rounded-lg border border-purple-500/30">
                                            <div className="text-3xl mb-2">🎓</div>
                                            <h4 className="font-semibold text-white mb-1">NFT Certificates</h4>
                                            <p className="text-sm text-gray-400">Blockchain-verified academic credentials</p>
                                        </div>
                                        <div className="p-4 bg-pink-500/10 rounded-lg border border-pink-500/30">
                                            <div className="text-3xl mb-2">📊</div>
                                            <h4 className="font-semibold text-white mb-1">Transparent Grading</h4>
                                            <p className="text-sm text-gray-400">Verifiable grade records on blockchain</p>
                                        </div>
                                    </div>
                                </motion.div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Floating Action Button */}
            <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="fixed bottom-8 right-8 w-16 h-16 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-full shadow-2xl shadow-indigo-500/50 flex items-center justify-center text-2xl z-40"
            >
                💬
            </motion.button>
        </div>
    );
};

export default Dashboard3D;
