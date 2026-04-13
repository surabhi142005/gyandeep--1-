/**
 * hooks/useLiveAnalytics.ts
 * Real-time analytics dashboard updates
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { realtimeClient } from '../services/realtimeClient';

interface AnalyticsData {
  attendanceRate: number;
  totalStudents: number;
  presentToday: number;
  weeklyTrend: { day: string; count: number }[];
  subjectPerformance: { subject: string; avgScore: number }[];
  quizStats: {
    totalAttempts: number;
    avgScore: number;
    recentSubmissions: any[];
  };
}

interface UseLiveAnalyticsOptions {
  sessionId?: string;
  teacherId?: string;
  classId?: string;
  refreshInterval?: number;
}

export function useLiveAnalytics({
  sessionId,
  teacherId,
  classId,
  refreshInterval = 10000,
}: UseLiveAnalyticsOptions) {
  const [data, setData] = useState<AnalyticsData>({
    attendanceRate: 0,
    totalStudents: 0,
    presentToday: 0,
    weeklyTrend: [],
    subjectPerformance: [],
    quizStats: { totalAttempts: 0, avgScore: 0, recentSubmissions: [] },
  });
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const dataRef = useRef(data);

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  // Fetch analytics data
  const fetchAnalytics = useCallback(async () => {
    if (!teacherId && !classId) return;

    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (teacherId) params.append('teacherId', teacherId);
      if (classId) params.append('classId', classId);
      if (sessionId) params.append('sessionId', sessionId);

      const [overviewRes, weeklyRes, leaderboardRes] = await Promise.all([
        fetch(`/api/analytics/overview?${params}`),
        fetch(`/api/attendance/weekly?${params}`),
        fetch(`/api/analytics/leaderboard?${params}`),
      ]);

      const overview = overviewRes.ok ? await overviewRes.json() : {};
      const weekly = weeklyRes.ok ? await weeklyRes.json() : [];
      const leaderboard = leaderboardRes.ok ? await leaderboardRes.json() : { leaderboard: [] };

      setData(prev => ({
        ...prev,
        attendanceRate: parseFloat(overview.attendanceRate) || 0,
        totalStudents: overview.totalStudents || 0,
        presentToday: overview.presentCount || 0,
        weeklyTrend: weekly.map((w: any) => ({ day: w.date, count: w.present })),
        subjectPerformance: [],
        quizStats: {
          totalAttempts: overview.totalGrades || 0,
          avgScore: parseFloat(overview.averageGrade) || 0,
          recentSubmissions: [],
        },
      }));

      setLastUpdate(new Date());
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setIsLoading(false);
    }
  }, [teacherId, classId, sessionId]);

  // Initial fetch and polling
  useEffect(() => {
    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchAnalytics, refreshInterval]);

  // WebSocket real-time updates
  useEffect(() => {
    const rooms: string[] = [];
    if (sessionId) rooms.push(`session-${sessionId}`);
    if (teacherId) rooms.push(`teacher-${teacherId}`);

    rooms.forEach(room => realtimeClient.joinRoom(room));

    // Listen for attendance changes
    const unsubAttendance = realtimeClient.on('attendance-changed', (data: any) => {
      console.log('[LiveAnalytics] Attendance update received:', data);
      // Increment present count optimistically
      setData(prev => ({
        ...prev,
        presentToday: prev.presentToday + 1,
        attendanceRate: Math.round(((prev.presentToday + 1) / Math.max(prev.totalStudents, 1)) * 100),
      }));
      // Then fetch fresh data
      setTimeout(fetchAnalytics, 500);
    });

    // Listen for quiz submissions
    const unsubQuiz = realtimeClient.on('quiz_submission', (data: any) => {
      console.log('[LiveAnalytics] Quiz submission received:', data);
      setData(prev => ({
        ...prev,
        quizStats: {
          ...prev.quizStats,
          totalAttempts: prev.quizStats.totalAttempts + 1,
          recentSubmissions: [data, ...prev.quizStats.recentSubmissions].slice(0, 10),
        },
      }));
      setTimeout(fetchAnalytics, 500);
    });

    // Listen for session updates
    const unsubSession = realtimeClient.on('session-update', (data: any) => {
      console.log('[LiveAnalytics] Session update received:', data);
      if (data?.type === 'started' || data?.type === 'ended') {
        fetchAnalytics();
      }
    });

    return () => {
      unsubAttendance();
      unsubQuiz();
      unsubSession();
      rooms.forEach(room => realtimeClient.leaveRoom(room));
    };
  }, [sessionId, teacherId, fetchAnalytics]);

  return {
    data,
    isLoading,
    lastUpdate,
    refresh: fetchAnalytics,
  };
}
