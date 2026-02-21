import React, { useEffect, useState } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import type { PerformanceTrend, AttendanceTrend, LiveClassMetrics } from '../types';
import { websocketService } from '../services/websocketService';

interface RealtimeAnalyticsProps {
    userId: string;
    userRole: 'teacher' | 'student' | 'admin';
    theme?: string;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

const RealtimeAnalytics: React.FC<RealtimeAnalyticsProps> = ({ userId, userRole, theme = 'indigo' }) => {
    const [performanceData, setPerformanceData] = useState<PerformanceTrend[]>([]);
    const [attendanceData, setAttendanceData] = useState<AttendanceTrend | null>(null);
    const [liveMetrics, setLiveMetrics] = useState<LiveClassMetrics | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchPerformanceData = async () => {
        // Fetch from backend or local storage
        try {
            const response = await fetch(`http://localhost:3001/api/analytics/performance?userId=${userId}`);
            if (response.ok) {
                const data = await response.json();
                setPerformanceData(data);
            }
        } catch (error) {
            console.error('Failed to fetch performance data:', error);
            // Use mock data for demonstration
            setPerformanceData([
                {
                    subject: 'Mathematics',
                    data: [
                        { date: '2026-02-01', score: 75 },
                        { date: '2026-02-05', score: 82 },
                        { date: '2026-02-10', score: 88 },
                        { date: '2026-02-13', score: 92 }
                    ],
                    average: 84,
                    trend: 'up'
                },
                {
                    subject: 'Science',
                    data: [
                        { date: '2026-02-01', score: 80 },
                        { date: '2026-02-05', score: 78 },
                        { date: '2026-02-10', score: 85 },
                        { date: '2026-02-13', score: 87 }
                    ],
                    average: 82,
                    trend: 'up'
                }
            ]);
        }
    };

    const fetchAttendanceData = async () => {
        try {
            const response = await fetch(`http://localhost:3001/api/analytics/attendance?userId=${userId}`);
            if (response.ok) {
                const data = await response.json();
                setAttendanceData(data);
            }
        } catch (error) {
            console.error('Failed to fetch attendance data:', error);
            // Mock data
            setAttendanceData({
                period: 'month',
                present: 18,
                absent: 2,
                percentage: 90
            });
        }
    };

    const updateLiveMetrics = (sessionData: Partial<LiveClassMetrics>) => {
        setLiveMetrics({
            sessionCode: sessionData.code || '',
            studentsPresent: sessionData.studentsPresent || 0,
            totalStudents: sessionData.totalStudents || 0,
            quizParticipation: sessionData.quizParticipation || 0,
            chatActivity: sessionData.chatActivity || 0,
            averageEngagement: sessionData.averageEngagement || 0
        });
    };

    useEffect(() => {
        // Subscribe to real-time updates
        const unsubscribePerformance = websocketService.on('performance-changed', () => {
            fetchPerformanceData();
        });

        const unsubscribeAttendance = websocketService.on('attendance-changed', () => {
            fetchAttendanceData();
        });

        const unsubscribeSession = websocketService.on('session-changed', (data) => {
            updateLiveMetrics(data);
        });

        // Initial data fetch
        fetchPerformanceData();
        fetchAttendanceData();
        setLoading(false);

        return () => {
            unsubscribePerformance();
            unsubscribeAttendance();
            unsubscribeSession();
        };
    }, [userId]);

    const fetchPerformanceData = async () => {
        // Fetch from backend or local storage
        try {
            const response = await fetch(`http://localhost:3001/api/analytics/performance?userId=${userId}`);
            if (response.ok) {
                const data = await response.json();
                setPerformanceData(data);
            }
        } catch (error) {
            console.error('Failed to fetch performance data:', error);
            // Use mock data for demonstration
            setPerformanceData([
                {
                    subject: 'Mathematics',
                    data: [
                        { date: '2026-02-01', score: 75 },
                        { date: '2026-02-05', score: 82 },
                        { date: '2026-02-10', score: 88 },
                        { date: '2026-02-13', score: 92 }
                    ],
                    average: 84,
                    trend: 'up'
                },
                {
                    subject: 'Science',
                    data: [
                        { date: '2026-02-01', score: 80 },
                        { date: '2026-02-05', score: 78 },
                        { date: '2026-02-10', score: 85 },
                        { date: '2026-02-13', score: 87 }
                    ],
                    average: 82,
                    trend: 'up'
                }
            ]);
        }
    };

    const fetchAttendanceData = async () => {
        try {
            const response = await fetch(`http://localhost:3001/api/analytics/attendance?userId=${userId}`);
            if (response.ok) {
                const data = await response.json();
                setAttendanceData(data);
            }
        } catch (error) {
            console.error('Failed to fetch attendance data:', error);
            // Mock data
            setAttendanceData({
                period: 'month',
                present: 18,
                absent: 2,
                percentage: 90
            });
        }
    };

    const updateLiveMetrics = (sessionData: any) => {
        setLiveMetrics({
            sessionCode: sessionData.code || '',
            studentsPresent: sessionData.studentsPresent || 0,
            totalStudents: sessionData.totalStudents || 0,
            quizParticipation: sessionData.quizParticipation || 0,
            chatActivity: sessionData.chatActivity || 0,
            averageEngagement: sessionData.averageEngagement || 0
        });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6 p-6 bg-gray-50 rounded-lg">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">📊 Real-Time Analytics Dashboard</h2>

            {/* Live Class Metrics */}
            {liveMetrics && (
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h3 className="text-xl font-semibold mb-4 text-gray-700">🔴 Live Class Metrics</h3>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <div className="text-center">
                            <div className="text-3xl font-bold text-indigo-600">{liveMetrics.studentsPresent}/{liveMetrics.totalStudents}</div>
                            <div className="text-sm text-gray-600">Students Present</div>
                        </div>
                        <div className="text-center">
                            <div className="text-3xl font-bold text-green-600">{liveMetrics.quizParticipation}%</div>
                            <div className="text-sm text-gray-600">Quiz Participation</div>
                        </div>
                        <div className="text-center">
                            <div className="text-3xl font-bold text-blue-600">{liveMetrics.chatActivity}</div>
                            <div className="text-sm text-gray-600">Chat Messages</div>
                        </div>
                        <div className="text-center">
                            <div className="text-3xl font-bold text-purple-600">{liveMetrics.averageEngagement}%</div>
                            <div className="text-sm text-gray-600">Avg Engagement</div>
                        </div>
                        <div className="text-center">
                            <div className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-1 rounded">{liveMetrics.sessionCode}</div>
                            <div className="text-sm text-gray-600">Session Code</div>
                        </div>
                    </div>
                </div>
            )}

            {/* Performance Trends */}
            <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold mb-4 text-gray-700">📈 Performance Trends</h3>
                <ResponsiveContainer width="100%" height={300}>
                    <LineChart>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" type="category" allowDuplicatedCategory={false} />
                        <YAxis domain={[0, 100]} />
                        <Tooltip />
                        <Legend />
                        {performanceData.map((subject, index) => (
                            <Line
                                key={subject.subject}
                                data={subject.data}
                                type="monotone"
                                dataKey="score"
                                name={subject.subject}
                                stroke={COLORS[index % COLORS.length]}
                                strokeWidth={2}
                                dot={{ r: 4 }}
                                activeDot={{ r: 6 }}
                            />
                        ))}
                    </LineChart>
                </ResponsiveContainer>
            </div>

            {/* Subject Averages */}
            <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold mb-4 text-gray-700">📊 Subject Averages</h3>
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={performanceData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="subject" />
                        <YAxis domain={[0, 100]} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="average" fill="#8884d8" name="Average Score">
                            {performanceData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* Attendance Overview */}
            {attendanceData && (
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h3 className="text-xl font-semibold mb-4 text-gray-700">✅ Attendance Overview (This Month)</h3>
                    <div className="flex items-center justify-between">
                        <ResponsiveContainer width="50%" height={200}>
                            <PieChart>
                                <Pie
                                    data={[
                                        { name: 'Present', value: attendanceData.present },
                                        { name: 'Absent', value: attendanceData.absent }
                                    ]}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    <Cell fill="#00C49F" />
                                    <Cell fill="#FF8042" />
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="text-center">
                            <div className="text-5xl font-bold text-green-600">{attendanceData.percentage}%</div>
                            <div className="text-lg text-gray-600 mt-2">Attendance Rate</div>
                            <div className="text-sm text-gray-500 mt-4">
                                {attendanceData.present} present / {attendanceData.absent} absent
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Trend Indicators */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {performanceData.map((subject, index) => (
                    <div key={subject.subject} className="bg-white p-4 rounded-lg shadow-md">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-sm text-gray-600">{subject.subject}</div>
                                <div className="text-2xl font-bold text-gray-800">{subject.average}%</div>
                            </div>
                            <div className={`text-3xl ${subject.trend === 'up' ? 'text-green-500' : subject.trend === 'down' ? 'text-red-500' : 'text-gray-400'}`}>
                                {subject.trend === 'up' ? '📈' : subject.trend === 'down' ? '📉' : '➡️'}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default RealtimeAnalytics;
