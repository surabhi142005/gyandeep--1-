/**
 * hooks/useClassSession.ts
 *
 * Extracts class session state and attendance handlers from App.tsx.
 * Manages: classSession, attendance, historicalRecords.
 */

import { useState } from 'react';
import type { ClassSession, AttendanceRecord, HistoricalSessionRecord, AnyUser, SubjectConfig } from '../types';
import { UserRole as UserRoleEnum } from '../types';
import type { Teacher } from '../types';

interface UseClassSessionOptions {
  allUsers: AnyUser[];
  allSubjects: SubjectConfig[];
  currentUserId?: string;
}

// localStorage-backed state for historical records per user
function loadHistoricalRecords(userId: string): HistoricalSessionRecord[] {
  try {
    const raw = window.localStorage.getItem(`attendanceHistory_${userId}`);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveHistoricalRecords(userId: string, records: HistoricalSessionRecord[]) {
  try {
    window.localStorage.setItem(`attendanceHistory_${userId}`, JSON.stringify(records));
  } catch {}
}

export function useClassSession({ allUsers, allSubjects, currentUserId }: UseClassSessionOptions) {
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [classSession, setClassSession] = useState<ClassSession>({
    code: null,
    expiry: null,
    notes: null,
    quiz: null,
    quizPublished: false,
    subject: allSubjects[0]?.name || 'Math',
    teacherLocation: null,
    attendanceRadius: 100,
  });
  const [historicalRecords, setHistoricalRecordsState] = useState<HistoricalSessionRecord[]>(
    () => loadHistoricalRecords(currentUserId || 'default')
  );

  const setHistoricalRecords = (records: HistoricalSessionRecord[] | ((prev: HistoricalSessionRecord[]) => HistoricalSessionRecord[])) => {
    setHistoricalRecordsState(prev => {
      const next = typeof records === 'function' ? records(prev) : records;
      saveHistoricalRecords(currentUserId || 'default', next);
      return next;
    });
  };

  // ── Session handlers ───────────────────────────────────────────────────────
  const handleUpdateSession = (sessionUpdate: Partial<ClassSession>) => {
    setClassSession(prev => ({ ...prev, ...sessionUpdate }));
  };

  /** Called when teacher logs in — reset session and initialise attendance list */
  const initTeacherSession = (teacher: Teacher) => {
    const currentStudents = allUsers.filter(u => u.role === UserRoleEnum.STUDENT);
    setAttendance(currentStudents.map(s => ({
      studentId: s.id,
      studentName: s.name,
      status: 'Absent',
      timestamp: null,
    })));
    const defaultSubject =
      allSubjects.find(s => teacher.assignedSubjects?.includes(s.id))?.name ||
      allSubjects[0]?.name || 'Math';
    setClassSession({
      code: null, expiry: null, notes: null, quiz: null,
      quizPublished: false, subject: defaultSubject,
      teacherLocation: null, attendanceRadius: 100,
    });
  };

  const handleMarkAttendance = (studentId: string) => {
    setAttendance(prev => prev.map(rec =>
      rec.studentId === studentId
        ? { ...rec, status: 'Present', timestamp: new Date() }
        : rec
    ));
  };

  const resetSession = () => {
    setClassSession({
      code: null, expiry: null, notes: null, quiz: null,
      quizPublished: false,
      subject: allSubjects[0]?.name || 'Math',
      teacherLocation: null, attendanceRadius: 100,
    });
    setAttendance([]);
  };

  return {
    classSession,
    attendance,
    historicalRecords,
    setHistoricalRecords,
    handleUpdateSession,
    handleMarkAttendance,
    initTeacherSession,
    resetSession,
  };
}
