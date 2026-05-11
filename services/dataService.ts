/**
 * dataService.ts
 *
 * All data operations go through the Express API (MongoDB/Redis backend).
 */

import { tokenManager } from './tokenManager';
import { websocketService } from './websocketService';
import { getCSRFHeaders, getCSRFToken } from './csrfService';
import type { AnyUser, ClassConfig, SubjectConfig } from '../types';

const API_BASE = import.meta.env.VITE_API_URL || '';
const API_TIMEOUT = 10000;

const uid = () => {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  } catch (err) { console.warn('[dataService] crypto.randomUUID not available', err); }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

const idempotencyKey = (prefix: string) => `gd-${prefix}-${uid()}`;

const extractArrayPayload = <T>(payload: unknown): T[] => {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>;
    if (Array.isArray(record.items)) return record.items as T[];
    if (Array.isArray(record.data)) return record.data as T[];
  }
  return [];
};

/**
 * Fetch with timeout to prevent hanging requests
 */
function fetchWithTimeout(url: string, options: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);
  return fetch(url, { ...options, signal: controller.signal })
    .finally(() => clearTimeout(timeoutId));
}

async function apiRequest(path: string, init: RequestInit = {}) {
  console.log('[API Request]', API_BASE + path);
  
  let csrfHeaders = {};
  if (init.method && init.method !== 'GET' && init.method !== 'HEAD' && init.method !== 'OPTIONS') {
    await getCSRFToken();
    csrfHeaders = getCSRFHeaders();
  }

  const token = tokenManager.getAccessToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...csrfHeaders,
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(init.headers as Record<string, string> || {}),
  };

  const res = await fetchWithTimeout(`${API_BASE}${path}`, { ...init, headers, credentials: 'include' });
  console.log('[API Response]', path, res.status);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = body.error || body.message || `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return body;
}

async function multipartRequest(path: string, formData: FormData) {
  await getCSRFToken();
  const csrfHeaders = getCSRFHeaders();
  const token = tokenManager.getAccessToken();
  const res = await fetchWithTimeout(`${API_BASE}${path}`, {
    method: 'POST',
    headers: {
      ...csrfHeaders,
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    },
    body: formData,
    credentials: 'include',
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = body.error || body.message || `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return body;
}

// ─── Users & Auth ────────────────────────────────────────────────────────────

export const fetchUsers = async (): Promise<AnyUser[]> => {
  const data = await apiRequest('/api/users', { method: 'GET' });
  return extractArrayPayload<AnyUser>(data);
};

export const saveUsers = async (users: any[]) => {
  return apiRequest('/api/admin/save-users', {
    method: 'POST',
    body: JSON.stringify({ users }),
  });
};

export const bulkImportUsers = async (users: any[]) => {
  return apiRequest('/api/admin/bulk-import', {
    method: 'POST',
    body: JSON.stringify({ users }),
  });
};

export const importUsersBulk = async (users: any[], defaultPassword?: string) => {
  return apiRequest('/api/admin/import-users', {
    method: 'POST',
    body: JSON.stringify({ users, defaultPassword }),
  });
};

export const importUsersCSV = async (csvData: string, defaultPassword?: string) => {
  return apiRequest('/api/admin/import-users/csv', {
    method: 'POST',
    body: JSON.stringify({ csvData, defaultPassword }),
  });
};

export const updateUserProfile = async (userId: string, updates: any) => {
  return apiRequest('/api/users/profile', {
    method: 'PUT',
    body: JSON.stringify({ userId, updates }),
  });
};

export const fetchBadges = async (userId: string): Promise<string[]> => {
  const data = await apiRequest(`/api/users/${userId}/badges`, { method: 'GET' });
  return Array.isArray(data?.badges) ? data.badges : [];
};

export const requestPasswordReset = async (email: string) => {
  return apiRequest('/api/auth/password/request', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
};

export const verifyPasswordReset = async (email: string, code: string) => {
  return apiRequest('/api/auth/password/verify', {
    method: 'POST',
    body: JSON.stringify({ email, code }),
  });
};

export const completePasswordReset = async (email: string, newPassword: string) => {
  return apiRequest('/api/auth/password/complete', {
    method: 'POST',
    body: JSON.stringify({ email, code: sessionStorage.getItem(`reset_code_${email}`) || '', newPassword }),
  });
};

export const sendEmailVerification = async (email: string) => {
  return apiRequest('/api/auth/email/verify-send', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
};

export const checkEmailVerification = async (email: string, code: string) => {
  return apiRequest('/api/auth/email/verify-check', {
    method: 'POST',
    body: JSON.stringify({ email, code }),
  });
};

// ─── Classes & Subjects ──────────────────────────────────────────────────────

export const fetchClasses = async (): Promise<ClassConfig[]> => {
  const data = await apiRequest('/api/classes', { method: 'GET' });
  return extractArrayPayload<ClassConfig>(data);
};

export const saveClasses = async (classes: any[]) => {
  return apiRequest('/api/classes', {
    method: 'POST',
    body: JSON.stringify(classes),
  });
};

export const fetchSubjects = async (): Promise<SubjectConfig[]> => {
  const data = await apiRequest('/api/subjects', { method: 'GET' });
  return extractArrayPayload<SubjectConfig>(data);
};

export const assignUserToClass = async (userId: string, classId: string | null) => {
  return apiRequest('/api/admin/assign-class', {
    method: 'POST',
    body: JSON.stringify({ userId, classId }),
  });
};

export const assignStudentToClass = async (studentId: string, classId: string | null) => {
  return apiRequest('/api/classes/assign', {
    method: 'POST',
    body: JSON.stringify({ userId: studentId, classId }),
  });
};

// ─── Sessions & Attendance ───────────────────────────────────────────────────

export const createClassSession = async (payload: any) => {
  return apiRequest('/api/sessions', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

export const startClassSession = async (sessionId: string) => {
  return apiRequest(`/api/sessions/${sessionId}/start`, { method: 'PATCH' });
};

export const endClassSession = async (sessionId: string) => {
  return apiRequest(`/api/sessions/${sessionId}/end`, { method: 'PATCH' });
};

export const fetchActiveSession = async (teacherId: string) => {
  const data = await apiRequest(`/api/sessions/active?teacherId=${teacherId}`, { method: 'GET' });
  return data.active ? data.session : null;
};

export const fetchActiveSessionByClass = async (classId: string) => {
  const data = await apiRequest(`/api/sessions/active?classId=${classId}`, { method: 'GET' });
  return data.active ? data.session : null;
};

export const fetchSessionById = async (sessionId: string) => {
  return apiRequest(`/api/sessions/${sessionId}`, { method: 'GET' });
};

export const regenerateSessionCode = async (sessionId: string, payload: any) => {
  return apiRequest(`/api/sessions/${sessionId}/code`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
};

export const verifySessionCode = async (code: string) => {
  return apiRequest(`/api/sessions/code/${code.toUpperCase()}/verify`, { method: 'GET' });
};

export const fetchAttendance = async (options: any = {}) => {
  const qs = new URLSearchParams(options).toString();
  const data = await apiRequest(`/api/attendance?${qs}`, { method: 'GET' });
  return extractArrayPayload(data);
};

export const fetchAttendancePaginated = async (options: any = {}) => {
  const qs = new URLSearchParams(options).toString();
  return apiRequest(`/api/attendance?${qs}`, { method: 'GET' });
};

export const createAttendanceRecord = async (record: any) => {
  return apiRequest('/api/attendance', {
    method: 'POST',
    body: JSON.stringify(record),
  });
};

export const createAttendanceBulk = async (records: any[]) => {
  return apiRequest('/api/attendance/bulk', {
    method: 'POST',
    body: JSON.stringify({ records }),
  });
};

export const updateAttendanceRecord = async (id: string, updates: any) => {
  return apiRequest(`/api/attendance/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
};

export const fetchAttendanceStats = async (options: any = {}) => {
  const qs = new URLSearchParams(options).toString();
  return apiRequest(`/api/attendance/stats?${qs}`, { method: 'GET' });
};

export const fetchSessionAttendance = async (sessionId: string) => {
  const data = await apiRequest(`/api/attendance?sessionId=${sessionId}`, { method: 'GET' });
  return extractArrayPayload(data);
};

export const fetchStudentAttendanceHistory = async (studentId: string, options: any = {}) => {
  const qs = new URLSearchParams(options).toString();
  return apiRequest(`/api/attendance/student/${studentId}?${qs}`, { method: 'GET' });
};

export const fetchWeeklyAttendance = async (teacherId: string) => {
  const data = await apiRequest(`/api/analytics/weekly-attendance/${teacherId}`, { method: 'GET' });
  return extractArrayPayload(data);
};

// ─── Quizzes & Question Bank ─────────────────────────────────────────────────

export const fetchQuestionBank = async (subject?: string) => {
  const qs = subject ? `?subject=${subject}` : '';
  const data = await apiRequest(`/api/question-bank${qs}`, { method: 'GET' });
  return extractArrayPayload(data);
};

export const addQuestionsToBank = async (questions: any[]) => {
  return apiRequest('/api/question-bank/add', {
    method: 'POST',
    body: JSON.stringify({ questions }),
  });
};

export const upsertQuizToBank = async (questions: any[], subject: string) => {
  return apiRequest('/api/quiz/bank', {
    method: 'POST',
    body: JSON.stringify({ questions, subject }),
  });
};

export const updateQuestionInBank = async (id: string, patch: any) => {
  return apiRequest('/api/question-bank/update', {
    method: 'POST',
    body: JSON.stringify({ id, patch }),
  });
};

export const deleteQuestionFromBank = async (id: string) => {
  return apiRequest(`/api/question-bank/${id}`, { method: 'DELETE' });
};

export const fetchAvailableQuizzes = async (classId: string) => {
  return apiRequest(`/api/quiz/available/${classId}`, { method: 'GET' });
};

export const fetchQuizResults = async (quizId: string) => {
  return apiRequest(`/api/quiz/${quizId}/results`, { method: 'GET' });
};

export const startSessionQuiz = async (sessionId: string, payload: { title?: string; questions: any[] }) => {
  return apiRequest(`/api/sessions/${sessionId}/quiz/start`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

export const submitQuiz = async (sessionId: string, studentId: string, answers: any[]) => {
  return apiRequest(`/api/sessions/${sessionId}/quiz/submit`, {
    method: 'POST',
    body: JSON.stringify({ studentId, answers }),
  });
};

export const submitStandaloneQuiz = async (quizId: string, answers: any[]) => {
  return apiRequest(`/api/quiz/${quizId}/submit`, {
    method: 'POST',
    body: JSON.stringify({ answers }),
  });
};

export const publishQuiz = async (quizId: string) => {
  return apiRequest(`/api/quiz/${quizId}/publish`, { method: 'POST' });
};

export const publishQuizToClass = async (payload: any) => {
  return apiRequest('/api/quiz/publish-to-class', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

// ─── Notes & Storage ─────────────────────────────────────────────────────────

export const uploadClassNotes = async (data: { classId: string; subjectId: string; content: string }) => {
  return apiRequest('/api/notes/centralized', {
    method: 'POST',
    body: JSON.stringify({
      ...data,
      title: `${data.subjectId} Quick Note`,
      noteType: 'class_notes',
      unitNumber: 1
    }),
  });
};

export const uploadSessionFile = async (data: { file: File; classId: string; subjectId: string; type: string; userId: string }) => {
  const formData = new FormData();
  formData.append('file', data.file);
  formData.append('classId', data.classId);
  formData.append('subjectId', data.subjectId);
  formData.append('type', data.type);
  formData.append('userId', data.userId);
  return multipartRequest('/api/storage/upload', formData);
};

export const uploadCentralizedFile = async (data: { file: File; classId: string; subjectId: string; title: string; noteType: string; userId: string }) => {
  const formData = new FormData();
  formData.append('file', data.file);
  formData.append('classId', data.classId);
  formData.append('subjectId', data.subjectId);
  formData.append('title', data.title);
  formData.append('noteType', data.noteType);
  formData.append('userId', data.userId);
  return multipartRequest('/api/storage/centralized', formData);
};

export const listClassNotes = async (params: { classId: string; subjectId: string }) => {
  const qs = new URLSearchParams(params).toString();
  return apiRequest(`/api/notes?${qs}`, { method: 'GET' });
};

export const fetchStudentNotes = async (classId: string, subjectId?: string) => {
  const qs = subjectId ? `?subjectId=${subjectId}` : '';
  return apiRequest(`/api/notes/student/${classId}${qs}`, { method: 'GET' });
};

export const fetchCentralizedNotes = async (params: { subjectId?: string; classId?: string }) => {
  const qs = new URLSearchParams(params as any).toString();
  const data = await apiRequest(`/api/notes/centralized?${qs}`, { method: 'GET' });
  return extractArrayPayload(data);
};

export const fetchCentralizedNotesCombined = async (subjectId: string, classId?: string) => {
  const [sessionNotes, centralizedNotes] = await Promise.all([
    listClassNotes({ classId: classId || '', subjectId }),
    fetchCentralizedNotes({ subjectId, classId })
  ]);
  return [
    ...(extractArrayPayload(sessionNotes)),
    ...(extractArrayPayload(centralizedNotes))
  ];
};

export const uploadCentralizedNotes = async (payload: any) => {
  return apiRequest('/api/notes/centralized', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

// ─── Analytics ───────────────────────────────────────────────────────────────

export const fetchTeacherStats = async (teacherId: string) => {
  return apiRequest(`/api/teacher/stats?teacherId=${teacherId}`, { method: 'GET' });
};

export const fetchQuizStats = async (teacherId: string) => {
  return apiRequest(`/api/teacher/quiz-stats?teacherId=${teacherId}`, { method: 'GET' });
};

export const getAnalyticsInsights = async (studentData: any, type?: string) => {
  return apiRequest('/api/analytics/insights', {
    method: 'POST',
    body: JSON.stringify({ studentData, type }),
  });
};

export const fetchPerformanceBySubject = async (classId?: string) => {
  const qs = classId ? `?classId=${classId}` : '';
  return apiRequest(`/api/analytics/performance-by-subject${qs}`, { method: 'GET' });
};

export const fetchStudentPerformance = async (studentId: string, startDate?: string, endDate?: string) => {
  const params = new URLSearchParams();
  if (startDate) params.set('startDate', startDate);
  if (endDate) params.set('endDate', endDate);
  const qs = params.toString();
  return apiRequest(`/api/analytics/student-performance/${studentId}${qs ? `?${qs}` : ''}`, { method: 'GET' });
};

export const fetchLeaderboard = async (classId?: string, limit?: number) => {
  const params = new URLSearchParams();
  if (classId) params.set('classId', classId);
  if (limit) params.set('limit', String(limit));
  const qs = params.toString();
  return apiRequest(`/api/analytics/leaderboard${qs ? `?${qs}` : ''}`, { method: 'GET' });
};

// ─── Miscellaneous ───────────────────────────────────────────────────────────

export const fetchAnnouncements = async (classId?: string) => {
  const qs = classId ? `?classId=${classId}` : '';
  return apiRequest(`/api/announcements${qs}`, { method: 'GET' });
};

export const createAnnouncement = async (payload: any) => {
  return apiRequest('/api/announcements', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

export const fetchTickets = async () => {
  const data = await apiRequest('/api/tickets', { method: 'GET' });
  return extractArrayPayload(data);
};

export const fetchUnassignedTickets = async () => {
  const data = await apiRequest('/api/tickets/unassigned', { method: 'GET' });
  return extractArrayPayload(data);
};

export const createTicket = async (ticket: any) => {
  return apiRequest('/api/tickets', {
    method: 'POST',
    body: JSON.stringify(ticket),
  });
};

export const replyToTicket = async (ticketId: string, reply: any) => {
  return apiRequest(`/api/tickets/${ticketId}/reply`, {
    method: 'POST',
    body: JSON.stringify(reply),
  });
};

export const closeTicket = async (ticketId: string) => {
  return apiRequest(`/api/tickets/${ticketId}/close`, { method: 'POST' });
};

export const assignTicket = async (ticketId: string, adminId?: string) => {
  return apiRequest(`/api/tickets/${ticketId}/assign`, {
    method: 'PATCH',
    body: JSON.stringify({ adminId }),
  });
};

export const fetchNotifications = async (userId: string) => {
  return apiRequest(`/api/notifications?userId=${userId}`, { method: 'GET' });
};

export const createNotification = async (notif: any) => {
  return apiRequest('/api/notifications', {
    method: 'POST',
    body: JSON.stringify(notif),
  });
};

export const markNotificationRead = async (id: string) => {
  return apiRequest(`/api/notifications/${id}/read`, { method: 'PATCH' });
};

export const deleteNotification = async (id: string) => {
  return apiRequest(`/api/notifications/${id}`, { method: 'DELETE' });
};

export const syncCalendar = async (title: string, start: string, end: string) => {
  return apiRequest('/api/integrations/calendar/sync', {
    method: 'POST',
    body: JSON.stringify({ title, start, end }),
  });
};

export const uploadToDrive = async (name: string, url: string) => {
  return apiRequest('/api/integrations/drive/upload', {
    method: 'POST',
    body: JSON.stringify({ name, url }),
  });
};

export const sendEmailNotification = async (payload: any) => {
  return apiRequest('/api/email-notification', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

export const sendAIEmail = async (payload: any) => {
  return apiRequest('/api/ai-email', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

export const checkEmailServiceHealth = async () => {
  return apiRequest('/api/admin/email/health', { method: 'GET' });
};

export const fetchTagPresets = async (subjectId?: string) => {
  const qs = subjectId ? `?subjectId=${subjectId}` : '';
  return apiRequest(`/api/tags-presets${qs}`, { method: 'GET' });
};

export const updateTagPresets = async (subject: string, tags: string[]) => {
  return apiRequest('/api/tags-presets/update', {
    method: 'POST',
    body: JSON.stringify({ subject, tags }),
  });
};

export const adminOverride = async (adminId: string, userId: string, action: string, reason?: string) => {
  return apiRequest('/api/admin/audit-logs', {
    method: 'POST',
    body: JSON.stringify({ type: 'admin_override', userId: adminId, details: { targetUserId: userId, action, reason } }),
  });
};

export const fetchWebhooks = async () => {
  return apiRequest('/api/webhooks', { method: 'GET' });
};

export const createWebhook = async (webhook: any) => {
  return apiRequest('/api/webhooks', {
    method: 'POST',
    body: JSON.stringify(webhook),
  });
};

export const deleteWebhook = async (id: string) => {
  return apiRequest(`/api/webhooks/${id}`, { method: 'DELETE' });
};

export const fetchGrades = async (options: any = {}) => {
  const qs = new URLSearchParams(options).toString();
  const data = await apiRequest(`/api/grades?${qs}`, { method: 'GET' });
  return extractArrayPayload(data);
};

export const addGrade = async (grade: any) => {
  return apiRequest('/api/grades', {
    method: 'POST',
    body: JSON.stringify(grade),
  });
};

export const addGradesBulk = async (grades: any[]) => {
  return apiRequest('/api/grades/bulk', {
    method: 'POST',
    body: JSON.stringify({ grades }),
  });
};

export const deleteGrade = async (id: string) => {
  return apiRequest(`/api/grades/${id}`, { method: 'DELETE' });
};

export const fetchTimetable = async () => {
  return apiRequest('/api/timetable', { method: 'GET' });
};

export const saveTimetable = async (entries: any[]) => {
  return apiRequest('/api/timetable', {
    method: 'POST',
    body: JSON.stringify(entries),
  });
};

export const addTimetableEntry = async (entry: any) => {
  return apiRequest('/api/timetable/entry', {
    method: 'POST',
    body: JSON.stringify(entry),
  });
};

export const deleteTimetableEntry = async (id: string) => {
  return apiRequest(`/api/timetable/${id}`, { method: 'DELETE' });
};
