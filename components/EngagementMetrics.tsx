import React, { useEffect, useState } from 'react';
import { websocketService } from '../services/websocketService';
import type { EngagementMetric } from '../types';

interface EngagementMetricsProps {
    userId: string;
    sessionCode?: string;
}

const EngagementMetrics: React.FC<EngagementMetricsProps> = ({ userId, sessionCode }) => {
    const [metrics, setMetrics] = useState<EngagementMetric[]>([]);
    const [totalEngagement, setTotalEngagement] = useState(0);

    useEffect(() => {
        // Subscribe to engagement updates
        const unsubscribe = websocketService.on('engagement-update', (data: EngagementMetric) => {
            setMetrics(prev => {
                const updated = [...prev, data];
                // Keep only last 100 metrics
                return updated.slice(-100);
            });
        });

        // Load initial metrics
        loadMetrics();

        return () => unsubscribe();
    }, [userId]);

    useEffect(() => {
        // Calculate total engagement
        const total = metrics.reduce((sum, m) => sum + m.count, 0);
        setTotalEngagement(total);
    }, [metrics]);

    const loadMetrics = async () => {
        try {
            const response = await fetch(`http://localhost:3001/api/analytics/engagement?userId=${userId}`);
            if (response.ok) {
                const data = await response.json();
                setMetrics(data);
            }
        } catch (error) {
            console.error('Failed to load engagement metrics:', error);
        }
    };

    const getMetricsByType = (type: string) => {
        return metrics.filter(m => m.type === type).reduce((sum, m) => sum + m.count, 0);
    };

    const quizCount = getMetricsByType('quiz');
    const chatCount = getMetricsByType('chat');
    const attendanceCount = getMetricsByType('attendance');
    const notesCount = getMetricsByType('notes');

    return (
        <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-semibold mb-4 text-gray-700">📊 Engagement Metrics</h3>

            {sessionCode && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-sm font-medium text-green-700">Live Session: {sessionCode}</span>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-3xl mb-2">📝</div>
                    <div className="text-2xl font-bold text-blue-600">{quizCount}</div>
                    <div className="text-sm text-gray-600">Quiz Attempts</div>
                </div>

                <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-3xl mb-2">💬</div>
                    <div className="text-2xl font-bold text-green-600">{chatCount}</div>
                    <div className="text-sm text-gray-600">Chat Messages</div>
                </div>

                <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <div className="text-3xl mb-2">✅</div>
                    <div className="text-2xl font-bold text-purple-600">{attendanceCount}</div>
                    <div className="text-sm text-gray-600">Attendance</div>
                </div>

                <div className="text-center p-4 bg-orange-50 rounded-lg">
                    <div className="text-3xl mb-2">📚</div>
                    <div className="text-2xl font-bold text-orange-600">{notesCount}</div>
                    <div className="text-sm text-gray-600">Notes Viewed</div>
                </div>
            </div>

            <div className="border-t pt-4">
                <div className="flex items-center justify-between">
                    <span className="text-gray-700 font-medium">Total Engagement Actions</span>
                    <span className="text-3xl font-bold text-indigo-600">{totalEngagement}</span>
                </div>
            </div>

            {/* Recent Activity Timeline */}
            <div className="mt-6">
                <h4 className="text-sm font-semibold text-gray-600 mb-3">Recent Activity</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                    {metrics.slice(-10).reverse().map((metric, index) => (
                        <div key={index} className="flex items-center gap-3 text-sm p-2 bg-gray-50 rounded">
                            <span className="text-lg">
                                {metric.type === 'quiz' && '📝'}
                                {metric.type === 'chat' && '💬'}
                                {metric.type === 'attendance' && '✅'}
                                {metric.type === 'notes' && '📚'}
                            </span>
                            <span className="flex-1 text-gray-700 capitalize">{metric.type}</span>
                            <span className="text-gray-500 text-xs">
                                {new Date(metric.timestamp).toLocaleTimeString()}
                            </span>
                        </div>
                    ))}
                    {metrics.length === 0 && (
                        <div className="text-center text-gray-400 py-4">No recent activity</div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default EngagementMetrics;
