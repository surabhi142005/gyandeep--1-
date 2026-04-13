/**
 * hooks/useLiveAttendance.ts
 * Real-time attendance updates via WebSocket
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { realtimeClient } from '../services/realtimeClient';

export interface AttendanceRecord {
  id: string;
  studentId: string;
  studentName: string;
  status: 'Present' | 'Absent' | 'Late' | 'Excused';
  timestamp: Date;
  sessionId?: string;
}

interface UseLiveAttendanceOptions {
  sessionId?: string;
  teacherId?: string;
  initialRecords?: AttendanceRecord[];
}

export function useLiveAttendance({
  sessionId,
  teacherId,
  initialRecords = [],
}: UseLiveAttendanceOptions) {
  const [records, setRecords] = useState<AttendanceRecord[]>(initialRecords);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [isLoading, setIsLoading] = useState(false);
  const recordsRef = useRef(records);

  // Keep ref in sync
  useEffect(() => {
    recordsRef.current = records;
  }, [records]);

  // Fetch initial attendance from server
  const fetchAttendance = useCallback(async () => {
    if (!sessionId) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/attendance?sessionId=${sessionId}&limit=100`);
      if (response.ok) {
        const data = await response.json();
        const formatted = data.items.map((item: any) => ({
          id: item.id || item._id,
          studentId: item.studentId,
          studentName: item.studentName || 'Student',
          status: item.status,
          timestamp: new Date(item.timestamp),
          sessionId: item.sessionId,
        }));
        setRecords(formatted);
        setLastUpdate(new Date());
      }
    } catch (error) {
      console.error('Failed to fetch attendance:', error);
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  // WebSocket listener for real-time updates
  useEffect(() => {
    if (!sessionId) return;

    // Join the session room
    const room = `session-${sessionId}`;
    realtimeClient.joinRoom(room);

    // Subscribe to attendance events
    const unsubAttendance = realtimeClient.on('attendance-changed', (data) => {
      console.log('[LiveAttendance] Received update:', data);

      setRecords(prev => {
        const existingIndex = prev.findIndex(r => r.studentId === data.studentId);
        const newRecord: AttendanceRecord = {
          id: data.id || `temp-${Date.now()}`,
          studentId: data.studentId,
          studentName: data.studentName || 'Student',
          status: data.status === 'present' || data.status === 'Present' ? 'Present' : data.status,
          timestamp: new Date(data.timestamp || Date.now()),
          sessionId: data.sessionId || sessionId,
        };

        if (existingIndex >= 0) {
          // Update existing record
          const updated = [...prev];
          updated[existingIndex] = { ...updated[existingIndex], ...newRecord };
          return updated;
        } else {
          // Add new record
          return [...prev, newRecord];
        }
      });

      setLastUpdate(new Date());
    });

    // Also listen for bulk updates
    const unsubBulk = realtimeClient.on('attendance-bulk-update', (data) => {
      if (data.sessionId === sessionId && Array.isArray(data.records)) {
        setRecords(data.records.map((r: any) => ({
          id: r.id,
          studentId: r.studentId,
          studentName: r.studentName || 'Student',
          status: r.status,
          timestamp: new Date(r.timestamp),
          sessionId: r.sessionId,
        })));
        setLastUpdate(new Date());
      }
    });

    // Initial fetch
    fetchAttendance();

    // Polling fallback every 10 seconds (in case WebSocket misses)
    const pollInterval = setInterval(fetchAttendance, 10000);

    return () => {
      unsubAttendance();
      unsubBulk();
      clearInterval(pollInterval);
      realtimeClient.leaveRoom(room);
    };
  }, [sessionId, fetchAttendance]);

  // Mark attendance (student action)
  const markAttendance = useCallback(async (studentId: string, options?: {
    faceImage?: string;
    coords?: { lat: number; lng: number };
  }) => {
    if (!sessionId) throw new Error('No active session');

    const response = await fetch('/api/attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentId,
        sessionId,
        status: 'Present',
        ...options,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to mark attendance');
    }

    const result = await response.json();
    return result;
  }, [sessionId]);

  // Get present count
  const presentCount = records.filter(r => r.status === 'Present').length;
  const totalCount = records.length;

  // Get present student IDs for quick lookup
  const presentStudentIds = new Set(records.filter(r => r.status === 'Present').map(r => r.studentId));

  return {
    records,
    presentCount,
    totalCount,
    presentStudentIds,
    lastUpdate,
    isLoading,
    markAttendance,
    refresh: fetchAttendance,
  };
}
