/**
 * dataService.ts
 *
 * All data operations go through the Express API (SQLite backend).
 * No localStorage fallback - requires backend connection.
 */

import { websocketService } from './websocketService';
import { getStoredToken } from './authService';

const API_BASE = import.meta.env.VITE_API_URL || '';

if (!API_BASE) {
  console.error('[dataService] VITE_API_URL not configured. Set in .env file');
}

const uid = () => {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  } catch { }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

const idempotencyKey = (prefix: string) => `gd-${prefix}-${uid()}`;

async function apiRequest(path: string, init: RequestInit = {}) {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string> || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
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

const lsSet = (key: string, value: unknown) => {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch (err) { console.warn('[dataService] localStorage set failed', err); }
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

    const token = getStoredToken();
    const res = await fetch(`${API_BASE}/api/notes/upload`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
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
  return apiRequest(`/api/notes/centralized/combined?${qs.toString()}`, { method: 'GET' });
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

export const fetchGrades = async () => {
  const rows = await apiRequest('/api/grades', { method: 'GET' });
  return Array.isArray(rows) ? rows : [];
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

// ─── Integrations (stubs) ───────────────────────────────────────────────────

export const syncCalendar = async (title: string, start: string, end: string) => {
  return { ok: true, message: 'Calendar sync is not yet available.' };
};

export const uploadToDrive = async (name: string, url: string) => {
  return { ok: true, message: 'Drive upload is not yet available.' };
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

// ─── Admin Override ──────────────────────────────────────────────────────────

export const adminOverride = async (adminId: string, userId: string, action: string, reason?: string) => {
  return apiRequest('/api/audit-logs', {
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
