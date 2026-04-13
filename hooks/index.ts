/**
 * hooks/index.ts
 * Export all custom hooks
 */

export { useClassSession } from './useClassSession';
export { useLiveSession } from './useLiveSession';
export { useLiveAttendance, type AttendanceRecord } from './useLiveAttendance';
export { useLiveLeaderboard } from './useLiveLeaderboard';
export { useLiveAnalytics } from './useLiveAnalytics';
export { useLiveQuiz } from './useLiveQuiz';
export { useCrossTabSync } from './useCrossTabSync';
export { useTeacherSession } from './useTeacherSession';
export { useQuizWorker } from './useQuizWorker';
export { useLiveNotifications, type Notification } from './useLiveNotifications';
export { useSessionPersistence } from './useSessionPersistence';
