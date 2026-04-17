/**
 * dataService.ts
 *
 * All data operations go through the Express API (SQLite backend).
 * No localStorage fallback - requires backend connection.
 */

import { websocketService } from './websocketService';
import { getCSRFHeaders } from './csrfService';

const API_BASE = import.meta.env.VITE_API_URL || '';

const uid = () => {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  } catch (err) { console.warn('[dataService] crypto.randomUUID not available', err); }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

const idempotencyKey = (prefix: string) => `gd-${prefix}-${uid()}`;

async function apiRequest(path: string, init: RequestInit = {}) {
  const csrfHeaders = await getCSRFHeaders();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...csrfHeaders,
    ...(init.headers as Record<string, string> || {}),
  };

  const res = await fetch(`${API_BASE}${path}`, { ...init, headers, credentials: 'include' });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = body.error || body.message || `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return body;
}

// ─── Utility ────────────────────────────────────────────────────────────────

const lsGet = <T>(key: string, defaultValue: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : defaultValue;
  } catch { return defaultValue; }
};

const lsSet = (_key: string, _value: unknown) => {
  // Reserved for future localStorage caching
};

// ─── Users / Profiles ────────────────────────────────────────────────────────

export const fetchUsers = async () => {
  const data = await apiRequest('/api/users', { method: 'GET' });
  return Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
};

export const saveUsers = async (users: any[]) => {
  return apiRequest('/api/users/bulk', {
    method: 'POST',
    body: JSON.stringify(users),
  });
};

export const bulkImportUsers = async (users: any[]) => saveUsers(users);

// ─── Classes ─────────────────────────────────────────────────────────────────

export const fetchClasses = async () => {
  const data = await apiRequest('/api/classes', { method: 'GET' });
  return Array.isArray(data) ? data : [];
};

export const saveClasses = async (classes: any[]) => {
  return apiRequest('/api/classes', {
    method: 'POST',
    body: JSON.stringify(classes),
  });
};

export const assignStudentToClass = async (studentId: string, classId: string | null) => {
  return apiRequest('/api/classes/assign', {
    method: 'POST',
    body: JSON.stringify({ studentId, classId }),
  });
};

// ─── Notes ───────────────────────────────────────────────────────────────────

export const uploadClassNotes = async (params: { classId: string; subjectId: string; content?: string; file?: File }) => {
  if (params.file) {
    const formData = new FormData();
    formData.append('file', params.file);
    formData.append('classId', params.classId);
    formData.append('subjectId', params.subjectId);

    const csrfHeaders = await getCSRFHeaders();
    const res = await fetch(`${API_BASE}/api/notes/upload`, {
      method: 'POST',
      headers: csrfHeaders,
      body: formData,
      credentials: 'include',
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || `Upload failed (${res.status})`);
    return body as { ok: boolean; url: string; extractedText?: string };
  }

  // Text content upload
  return apiRequest('/api/notes/upload', {
    method: 'POST',
    body: JSON.stringify({ classId: params.classId, subjectId: params.subjectId, content: params.content }),
  });
};

export const listClassNotes = async (params: { classId: string; subjectId: string }) => {
  const qs = new URLSearchParams({ classId: params.classId, subjectId: params.subjectId });
  return await apiRequest(`/api/notes?${qs.toString()}`, { method: 'GET' });
};

// ─── Centralized Notes ──────────────────────────────────────────────────────

export const fetchCentralizedNotes = async (params: { subjectId: string; unitNumber?: number; classId?: string }) => {
  const qs = new URLSearchParams({ subjectId: params.subjectId });
  if (params.unitNumber != null) qs.set('unitNumber', String(params.unitNumber));
  if (params.classId) qs.set('classId', params.classId);
  return apiRequest(`/api/notes/centralized?${qs.toString()}`, { method: 'GET' });
};

export const fetchCentralizedNotesCombined = async (params: { subjectId: string; classId?: string }) => {
  const qs = new URLSearchParams({ subjectId: params.subjectId });
  if (params.classId) qs.set('classId', params.classId);
  const notes = await apiRequest(`/api/notes/centralized?${qs.toString()}`, { method: 'GET' });
  if (!Array.isArray(notes)) return [];

  const grouped = new Map<number, { unitNumber: number; unitName: string; notes: any[] }>();
  for (const note of notes) {
    const unit = Number(note.unitNumber) || 0;
    if (!grouped.has(unit)) {
      grouped.set(unit, { unitNumber: unit, unitName: note.unitName || `Unit ${unit || 1}`, notes: [] });
    }
    grouped.get(unit)!.notes.push(note);
  }
  return Array.from(grouped.values()).sort((a, b) => a.unitNumber - b.unitNumber);
};

export const uploadCentralizedNotes = async (payload: {
  classId?: string; subjectId: string; unitNumber: number; unitName: string;
  title: string; content: string; noteType?: string;
}) => {
  return apiRequest('/api/notes/centralized', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

// ─── Question Bank ───────────────────────────────────────────────────────────

export const fetchQuestionBank = async () => {
  const data = await apiRequest('/api/question-bank', { method: 'GET' });
  return Array.isArray(data) ? data : [];
};

export const addQuestionsToBank = async (questions: any[]) => {
  return apiRequest('/api/question-bank/add', {
    method: 'POST',
    body: JSON.stringify({ questions }),
  });
};

export const upsertQuizToBank = async (quiz: any[], subject: string) => {
  return apiRequest('/api/question-bank/upsert-quiz', {
    method: 'POST',
    body: JSON.stringify({ quiz, subject }),
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

// ─── Password Reset ──────────────────────────────────────────────────────────

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

// ─── Tag Presets ─────────────────────────────────────────────────────────────

const DEFAULT_TAG_PRESETS: Record<string, string[]> = {
  Mathematics: ['algebra', 'geometry', 'trigonometry', 'calculus', 'practice'],
  Science: ['physics', 'chemistry', 'biology', 'lab', 'experiment'],
  History: ['timeline', 'event', 'figure', 'cause', 'effect'],
  English: ['grammar', 'vocabulary', 'reading', 'writing', 'comprehension'],
};

export const fetchTagPresets = async () => {
  const data = await apiRequest('/api/tags-presets', { method: 'GET' });
  return { ...DEFAULT_TAG_PRESETS, ...data };
};

export const updateTagPresets = async (subject: string, tags: string[]) => {
  return apiRequest('/api/tags-presets/update', {
    method: 'POST',
    body: JSON.stringify({ subject, tags }),
  });
};

// ─── Grades ──────────────────────────────────────────────────────────────────

export interface PaginatedGrades {
  items: any[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface FetchGradesOptions {
  studentId?: string;
  subjectId?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export const fetchGrades = async (options?: FetchGradesOptions): Promise<any[]> => {
  const params = new URLSearchParams();
  if (options?.studentId) params.set('studentId', options.studentId);
  if (options?.subjectId) params.set('subjectId', options.subjectId);
  if (options?.page) params.set('page', String(options.page));
  if (options?.limit) params.set('limit', String(options.limit));
  if (options?.sortBy) params.set('sortBy', options.sortBy);
  if (options?.sortOrder) params.set('sortOrder', options.sortOrder);

  const queryString = params.toString();
  const rows = await apiRequest(`/api/grades${queryString ? `?${queryString}` : ''}`, { method: 'GET' });
  if (Array.isArray(rows)) return rows;
  return Array.isArray(rows?.items) ? rows.items : [];
};

export const fetchGradesPaginated = async (options?: FetchGradesOptions): Promise<PaginatedGrades> => {
  const params = new URLSearchParams();
  if (options?.studentId) params.set('studentId', options.studentId);
  if (options?.subjectId) params.set('subjectId', options.subjectId);
  if (options?.page) params.set('page', String(options.page));
  if (options?.limit) params.set('limit', String(options.limit));
  if (options?.sortBy) params.set('sortBy', options.sortBy);
  if (options?.sortOrder) params.set('sortOrder', options.sortOrder);

  const queryString = params.toString();
  const result = await apiRequest(`/api/grades${queryString ? `?${queryString}` : ''}`, { method: 'GET' });
  if (result?.items && result?.pagination) return result;
  return { items: Array.isArray(result) ? result : [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0, hasNext: false, hasPrev: false } };
};

export const addGrade = async (grade: { studentId: string; subject: string; category: string; title: string; score: number; maxScore: number; weight?: number; date?: string; teacherId?: string }) => {
  const newGrade = { ...grade, id: `g_${Date.now()}`, date: grade.date || new Date().toISOString().split('T')[0] };
  const payload = await apiRequest('/api/grades', {
    method: 'POST',
    headers: { 'Idempotency-Key': idempotencyKey('grade-create') },
    body: JSON.stringify(newGrade),
  });
  websocketService.sendGradesUpdate({ type: 'created', id: payload?.grade?.id || newGrade.id });
  return payload?.grade || newGrade;
};

export const addGradesBulk = async (grades: any[]) => {
  const payload = await apiRequest('/api/grades/bulk', {
    method: 'POST',
    headers: { 'Idempotency-Key': idempotencyKey('grade-bulk') },
    body: JSON.stringify({ grades }),
  });
  websocketService.sendGradesUpdate({ type: 'bulk-created', count: payload?.count || grades.length });
  return payload;
};

export const deleteGrade = async (id: string) => {
  const payload = await apiRequest(`/api/grades/${id}`, {
    method: 'DELETE',
    headers: { 'Idempotency-Key': idempotencyKey('grade-delete') },
  });
  websocketService.sendGradesUpdate({ type: 'deleted', id });
  return payload;
};

// ─── Timetable ───────────────────────────────────────────────────────────────

export const fetchTimetable = async () => {
  const rows = await apiRequest('/api/timetable', { method: 'GET' });
  return Array.isArray(rows) ? rows : [];
};

export const saveTimetable = async (entries: any[]) => {
  return apiRequest('/api/timetable', {
    method: 'POST',
    headers: { 'Idempotency-Key': idempotencyKey('tt-replace') },
    body: JSON.stringify(entries),
  });
};

export const addTimetableEntry = async (entry: any) => {
  const newEntry = { ...entry, id: `tt_${Date.now()}` };
  const payload = await apiRequest('/api/timetable/entry', {
    method: 'POST',
    headers: { 'Idempotency-Key': idempotencyKey('tt-create') },
    body: JSON.stringify(entry),
  });
  websocketService.sendTimetableUpdate({ type: 'created', id: payload?.entry?.id || newEntry.id });
  return payload?.entry || newEntry;
};

export const deleteTimetableEntry = async (id: string) => {
  const payload = await apiRequest(`/api/timetable/${id}`, {
    method: 'DELETE',
    headers: { 'Idempotency-Key': idempotencyKey('tt-delete') },
  });
  websocketService.sendTimetableUpdate({ type: 'deleted', id });
  return payload;
};

// ─── Tickets ─────────────────────────────────────────────────────────────────

export const fetchTickets = async () => {
  const rows = await apiRequest('/api/tickets', { method: 'GET' });
  return Array.isArray(rows) ? rows : [];
};

export const fetchUnassignedTickets = async () => {
  const rows = await apiRequest('/api/tickets/unassigned', { method: 'GET' });
  return Array.isArray(rows) ? rows : [];
};

export const createTicket = async (ticket: { subject: string; message: string; category?: string; priority?: 'low' | 'medium' | 'high' }) => {
  const newTicket = { ...ticket, id: `t_${Date.now()}`, status: 'open', createdAt: new Date().toISOString(), replies: [], version: 1, priority: ticket.priority || 'medium' };
  const payload = await apiRequest('/api/tickets', {
    method: 'POST',
    headers: { 'Idempotency-Key': idempotencyKey('ticket-create') },
    body: JSON.stringify(newTicket),
  });
  websocketService.sendTicketsUpdate({ type: 'created', id: payload?.ticket?.id || newTicket.id });
  return payload?.ticket || newTicket;
};

export const replyToTicket = async (ticketId: string, reply: any, expectedVersion?: number) => {
  const payload = await apiRequest(`/api/tickets/${ticketId}/reply`, {
    method: 'POST',
    headers: { 'Idempotency-Key': idempotencyKey('ticket-reply') },
    body: JSON.stringify({ ...reply, expectedVersion }),
  });
  websocketService.sendTicketsUpdate({ type: 'replied', id: ticketId });
  return payload;
};

export const closeTicket = async (ticketId: string, expectedVersion?: number) => {
  const payload = await apiRequest(`/api/tickets/${ticketId}/close`, {
    method: 'POST',
    headers: { 'Idempotency-Key': idempotencyKey('ticket-close') },
    body: JSON.stringify({ expectedVersion }),
  });
  websocketService.sendTicketsUpdate({ type: 'closed', id: ticketId });
  return payload;
};

export const assignTicket = async (ticketId: string, adminId?: string) => {
  const payload = await apiRequest(`/api/tickets/${ticketId}/assign`, {
    method: 'PATCH',
    body: JSON.stringify({ adminId }),
  });
  websocketService.sendTicketsUpdate({ type: 'assigned', id: ticketId, assignedToId: payload?.assignedToId });
  return payload;
};

// ─── Notifications ───────────────────────────────────────────────────────────

export const fetchNotifications = async (userId: string) => {
  try {
    const rows = await apiRequest('/api/notifications', { method: 'GET' });
    return Array.isArray(rows) ? rows : [];
  } catch {
    return lsGet(`gyandeep-notifications-${userId}`, []);
  }
};

export const createNotification = async (notif: any) => {
  const newNotif = { ...notif, id: `n_${Date.now()}`, read: false, createdAt: new Date().toISOString() };
  const payload = await apiRequest('/api/notifications', {
    method: 'POST',
    headers: { 'Idempotency-Key': idempotencyKey('notif-create') },
    body: JSON.stringify({
      userId: notif.userId || 'all',
      title: notif.title,
      message: notif.message,
      type: notif.type || 'system',
      relatedId: notif.relatedId || null,
      relatedType: notif.relatedType || null,
    }),
  });
  return payload?.notification || newNotif;
};

export const markNotificationRead = async (id: string) => {
  return apiRequest(`/api/notifications/${id}/read`, { method: 'PATCH' });
};

export const deleteNotification = async (id: string) => {
  return apiRequest(`/api/notifications/${id}`, { method: 'DELETE' });
};

// ─── Integrations ───────────────────────────────────────────────────

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

// ─── Analytics ───────────────────────────────────────────────────────────────

export const getAnalyticsInsights = async (studentData: any, type?: string) => {
  try {
    return await apiRequest('/api/analytics/insights', {
      method: 'POST',
      body: JSON.stringify({ studentData, type }),
    });
  } catch {
    return { insights: [] };
  }
};

export const fetchPerformanceBySubject = async (classId?: string) => {
  try {
    const params = classId ? `?classId=${classId}` : '';
    const data = await apiRequest(`/api/analytics/performance-by-subject${params}`, { method: 'GET' });
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
};

// ─── Admin Override ──────────────────────────────────────────────────────────

export const adminOverride = async (adminId: string, userId: string, action: string, reason?: string) => {
  return apiRequest('/api/admin/audit-logs', {
    method: 'POST',
    body: JSON.stringify({
      type: 'admin_override',
      userId: adminId,
      details: { targetUserId: userId, action, reason },
    }),
  });
};

// ─── Webhooks ────────────────────────────────────────────────────────────────

export const fetchWebhooks = async () => {
  const data = await apiRequest('/api/webhooks', { method: 'GET' });
  return Array.isArray(data) ? data : [];
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

// ─── Email Verification ─────────────────────────────────────────────────────

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

export const sendEmailNotification = async (payload: { to: string | string[]; subject: string; html: string }) => {
  return apiRequest('/api/email-notification', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

export const sendAIEmail = async (payload: { prompt: string; recipients: string | string[]; context?: string }) => {
  return apiRequest('/api/ai-email', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

export const checkEmailServiceHealth = async () => {
  return apiRequest('/api/admin/email/health', { method: 'GET' });
};

// ─── Attendance ───────────────────────────────────────────────────────────────

export interface PaginatedAttendance {
  items: any[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface FetchAttendanceOptions {
  studentId?: string;
  classId?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export const fetchAttendance = async (options?: FetchAttendanceOptions): Promise<any[]> => {
  const params = new URLSearchParams();
  if (options?.studentId) params.set('studentId', options.studentId);
  if (options?.classId) params.set('classId', options.classId);
  if (options?.status) params.set('status', options.status);
  if (options?.startDate) params.set('startDate', options.startDate);
  if (options?.endDate) params.set('endDate', options.endDate);
  if (options?.page) params.set('page', String(options.page));
  if (options?.limit) params.set('limit', String(options.limit));
  if (options?.sortBy) params.set('sortBy', options.sortBy);
  if (options?.sortOrder) params.set('sortOrder', options.sortOrder);

  const queryString = params.toString();
  const rows = await apiRequest(`/api/attendance${queryString ? `?${queryString}` : ''}`, { method: 'GET' });
  if (Array.isArray(rows)) return rows;
  return Array.isArray(rows?.items) ? rows.items : [];
};

export const fetchAttendancePaginated = async (options?: FetchAttendanceOptions): Promise<PaginatedAttendance> => {
  const params = new URLSearchParams();
  if (options?.studentId) params.set('studentId', options.studentId);
  if (options?.classId) params.set('classId', options.classId);
  if (options?.status) params.set('status', options.status);
  if (options?.startDate) params.set('startDate', options.startDate);
  if (options?.endDate) params.set('endDate', options.endDate);
  if (options?.page) params.set('page', String(options.page));
  if (options?.limit) params.set('limit', String(options.limit));
  if (options?.sortBy) params.set('sortBy', options.sortBy);
  if (options?.sortOrder) params.set('sortOrder', options.sortOrder);

  const queryString = params.toString();
  const result = await apiRequest(`/api/attendance${queryString ? `?${queryString}` : ''}`, { method: 'GET' });
  if (result?.items && result?.pagination) return result;
  return { items: Array.isArray(result) ? result : [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0, hasNext: false, hasPrev: false } };
};

export const createAttendanceRecord = async (record: { studentId: string; classId?: string; sessionId?: string; status: string; notes?: string }) => {
  const payload = await apiRequest('/api/attendance', {
    method: 'POST',
    body: JSON.stringify(record),
  });
  websocketService.sendAttendanceUpdate({ type: 'created', id: payload?.record?.id });
  return payload?.record;
};

export const createAttendanceBulk = async (records: Array<{ studentId: string; classId?: string; sessionId?: string; status: string; notes?: string }>) => {
  const payload = await apiRequest('/api/attendance/bulk', {
    method: 'POST',
    body: JSON.stringify({ records }),
  });
  websocketService.sendAttendanceUpdate({ type: 'bulk-created', count: payload?.count || records.length });
  return payload;
};

export const updateAttendanceRecord = async (id: string, updates: { status?: string; notes?: string }) => {
  const payload = await apiRequest(`/api/attendance/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
  websocketService.sendAttendanceUpdate({ type: 'updated', id });
  return payload?.record;
};

export const fetchAttendanceStats = async (options?: { studentId?: string; classId?: string; startDate?: string; endDate?: string }) => {
  const params = new URLSearchParams();
  if (options?.studentId) params.set('studentId', options.studentId);
  if (options?.classId) params.set('classId', options.classId);
  if (options?.startDate) params.set('startDate', options.startDate);
  if (options?.endDate) params.set('endDate', options.endDate);

  const queryString = params.toString();
  return apiRequest(`/api/attendance/stats${queryString ? `?${queryString}` : ''}`, { method: 'GET' });
};

export const fetchTeacherStats = async (teacherId: string) => {
  const data = await apiRequest(`/api/teacher/stats?teacherId=${teacherId}`, { method: 'GET' });
  return data || { quizzesTaken: 0, avgScore: 0, totalStudents: 0, attendanceRate: 0 };
};

export const fetchQuizStats = async (teacherId: string) => {
  const data = await apiRequest(`/api/teacher/quiz-stats?teacherId=${teacherId}`, { method: 'GET' });
  return data || { totalQuizzes: 0, avgScore: 0, totalAttempts: 0 };
};

export const fetchWeeklyAttendance = async (classId: string) => {
  const data = await apiRequest(`/api/attendance/weekly?classId=${classId}`, { method: 'GET' });
  return Array.isArray(data) ? data : [];
};

export const fetchSessionAttendance = async (sessionId: string) => {
  const data = await apiRequest(`/api/attendance?sessionId=${sessionId}`, { method: 'GET' });
  return Array.isArray(data) ? data : (data?.items || []);
};

export const verifySessionCode = async (code: string) => {
  return apiRequest(`/api/sessions/code/${code.toUpperCase()}/verify`, { method: 'GET' });
};

export const fetchActiveSession = async (teacherId: string) => {
  return apiRequest(`/api/sessions/active?teacherId=${teacherId}`, { method: 'GET' });
};

export const fetchSessionById = async (sessionId: string) => {
  return apiRequest(`/api/sessions/${sessionId}`, { method: 'GET' });
};

export const submitQuiz = async (sessionId: string, studentId: string, answers: Array<{ answer: string }>) => {
  return apiRequest(`/api/sessions/${sessionId}/quiz/submit`, {
    method: 'POST',
    body: JSON.stringify({ studentId, answers }),
  });
};

export const fetchLeaderboard = async (classId?: string, limit?: number) => {
  const params = new URLSearchParams();
  if (classId) params.set('classId', classId);
  if (limit) params.set('limit', String(limit));
  const queryString = params.toString();
  return apiRequest(`/api/analytics/leaderboard${queryString ? `?${queryString}` : ''}`, { method: 'GET' });
};

export const importUsersBulk = async (users: Array<{ name: string; email: string; role?: string; classId?: string }>, defaultPassword?: string) => {
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

export const fetchStudentPerformance = async (studentId: string, startDate?: string, endDate?: string) => {
  const params = new URLSearchParams();
  if (startDate) params.set('startDate', startDate);
  if (endDate) params.set('endDate', endDate);
  const queryString = params.toString();
  return apiRequest(`/api/analytics/student/${studentId}/performance${queryString ? `?${queryString}` : ''}`, { method: 'GET' });
};
