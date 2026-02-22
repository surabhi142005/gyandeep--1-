/**
 * dataService.ts
 *
 * All data operations go through Supabase.
 * Falls back to localStorage when Supabase is not configured (offline mode).
 */

import { supabase } from './supabaseClient';

const isSupabaseConfigured = () => {
  const url = import.meta.env.VITE_SUPABASE_URL;
  return !!url && url !== 'https://placeholder.supabase.co';
};

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
  if (!isSupabaseConfigured()) return lsGet('gyandeep-users', []);

  const { data, error } = await supabase.from('profiles').select('*');
  if (error) throw new Error(error.message);

  return (data || []).map(p => ({
    id: p.id,
    name: p.name,
    email: p.email,
    role: p.role,
    faceImage: p.face_image,
    preferences: p.preferences || {},
    history: p.history || [],
    assignedSubjects: p.assigned_subjects || [],
    performance: p.performance || [],
    classId: p.class_id,
    xp: p.xp || 0,
    badges: p.badges || [],
    coins: p.coins || 0,
    level: p.level || 1
  }));
};

export const saveUsers = async (users: any[]) => {
  if (!isSupabaseConfigured()) {
    lsSet('gyandeep-users', users);
    return { ok: true };
  }

  for (const u of users) {
    await supabase.from('profiles').upsert({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      face_image: u.faceImage,
      preferences: u.preferences,
      history: u.history,
      assigned_subjects: u.assignedSubjects,
      performance: u.performance,
      class_id: u.classId,
      xp: u.xp,
      badges: u.badges,
      coins: u.coins,
      level: u.level
    });
  }
  return { ok: true };
};

export const bulkImportUsers = async (users: any[]) => saveUsers(users);

// ─── Classes ─────────────────────────────────────────────────────────────────

export const fetchClasses = async () => {
  if (!isSupabaseConfigured()) return lsGet('gyandeep-classes', []);

  const { data, error } = await supabase.from('classes').select('*');
  if (error) throw new Error(error.message);
  return data || [];
};

export const saveClasses = async (classes: any[]) => {
  if (!isSupabaseConfigured()) {
    lsSet('gyandeep-classes', classes);
    return { ok: true };
  }

  const { error } = await supabase.from('classes').upsert(classes);
  if (error) throw new Error(error.message);
  return { ok: true };
};

export const assignStudentToClass = async (studentId: string, classId: string | null) => {
  if (!isSupabaseConfigured()) {
    const users: any[] = lsGet('gyandeep-users', []);
    lsSet('gyandeep-users', users.map(u => u.id === studentId ? { ...u, classId } : u));
    return { ok: true };
  }

  const { error } = await supabase.from('profiles').update({ class_id: classId }).eq('id', studentId);
  if (error) throw new Error(error.message);
  return { ok: true };
};

// ─── Notes ───────────────────────────────────────────────────────────────────

export const uploadClassNotes = async (params: { classId: string; subjectId: string; content: string }) => {
  if (!isSupabaseConfigured()) {
    const key = `notes_${params.classId}_${params.subjectId}`;
    lsSet(key, { content: params.content, updatedAt: new Date().toISOString() });
    return { url: `local://${key}` };
  }

  const fileName = `${params.classId}/${params.subjectId}/${Date.now()}.txt`;
  const { error: uploadError } = await supabase.storage
    .from('notes')
    .upload(fileName, new Blob([params.content], { type: 'text/plain' }), { upsert: true });

  if (uploadError) throw new Error(uploadError.message);

  const noteId = `note_${Date.now()}`;
  await supabase.from('notes').insert({
    id: noteId,
    class_id: params.classId,
    subject_id: params.subjectId,
    storage_path: fileName,
    file_name: `Notes - ${new Date().toLocaleDateString()}`
  });

  const { data: { publicUrl } } = supabase.storage.from('notes').getPublicUrl(fileName);
  return { url: publicUrl };
};

export const listClassNotes = async (params: { classId: string; subjectId: string }) => {
  if (!isSupabaseConfigured()) return [];

  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .eq('class_id', params.classId)
    .eq('subject_id', params.subjectId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  return (data || []).map(n => {
    const { data: { publicUrl } } = supabase.storage.from('notes').getPublicUrl(n.storage_path);
    return { url: publicUrl, name: n.file_name || n.storage_path };
  });
};

// ─── Question Bank ───────────────────────────────────────────────────────────

export const fetchQuestionBank = async () => {
  if (!isSupabaseConfigured()) return lsGet('gyandeep-question-bank', []);

  const { data, error } = await supabase.from('questions').select('*');
  if (error) throw new Error(error.message);

  return (data || []).map(q => ({
    id: q.id,
    question: q.question,
    options: q.options,
    correctAnswer: q.correct_answer,
    tags: q.tags || [],
    difficulty: q.difficulty,
    subject: q.subject
  }));
};

export const addQuestionsToBank = async (questions: any[]) => {
  if (!isSupabaseConfigured()) {
    const existing: any[] = lsGet('gyandeep-question-bank', []);
    lsSet('gyandeep-question-bank', [...existing, ...questions]);
    return { ok: true };
  }

  const rows = questions.map(q => ({
    id: q.id || `q_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    question: q.question,
    options: q.options,
    correct_answer: q.correctAnswer,
    tags: q.tags || [],
    difficulty: q.difficulty || 'medium',
    subject: q.subject
  }));

  const { error } = await supabase.from('questions').insert(rows);
  if (error) throw new Error(error.message);
  return { ok: true };
};

export const upsertQuizToBank = async (quiz: any[], subject: string) => {
  if (!isSupabaseConfigured()) {
    const existing: any[] = lsGet('gyandeep-question-bank', []);
    const withSubject = quiz.map(q => ({ ...q, subject }));
    lsSet('gyandeep-question-bank', [...existing.filter(q => q.subject !== subject), ...withSubject]);
    return { ok: true };
  }

  // Delete existing questions for this subject, then insert new
  await supabase.from('questions').delete().eq('subject', subject);

  const rows = quiz.map(q => ({
    id: q.id || `q_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    question: q.question,
    options: q.options,
    correct_answer: q.correctAnswer,
    tags: q.tags || [],
    difficulty: q.difficulty || 'medium',
    subject
  }));

  const { error } = await supabase.from('questions').insert(rows);
  if (error) throw new Error(error.message);
  return { ok: true };
};

export const updateQuestionInBank = async (id: string, patch: any) => {
  if (!isSupabaseConfigured()) {
    const existing: any[] = lsGet('gyandeep-question-bank', []);
    lsSet('gyandeep-question-bank', existing.map(q => q.id === id ? { ...q, ...patch } : q));
    return { ok: true };
  }

  const update: any = {};
  if (patch.question !== undefined) update.question = patch.question;
  if (patch.options !== undefined) update.options = patch.options;
  if (patch.correctAnswer !== undefined) update.correct_answer = patch.correctAnswer;
  if (patch.tags !== undefined) update.tags = patch.tags;
  if (patch.difficulty !== undefined) update.difficulty = patch.difficulty;
  if (patch.subject !== undefined) update.subject = patch.subject;

  const { error } = await supabase.from('questions').update(update).eq('id', id);
  if (error) throw new Error(error.message);
  return { ok: true };
};

export const deleteQuestionFromBank = async (id: string) => {
  if (!isSupabaseConfigured()) {
    const existing: any[] = lsGet('gyandeep-question-bank', []);
    lsSet('gyandeep-question-bank', existing.filter(q => q.id !== id));
    return { ok: true };
  }

  const { error } = await supabase.from('questions').delete().eq('id', id);
  if (error) throw new Error(error.message);
  return { ok: true };
};

// ─── Password Reset (now via Supabase Auth) ──────────────────────────────────

export const requestPasswordReset = async (email: string) => {
  if (!isSupabaseConfigured()) {
    // Offline fallback
    const users: any[] = lsGet('gyandeep-users', []);
    const user = users.find(u => u.email?.toLowerCase() === email.toLowerCase());
    if (!user) throw new Error('No account found with that email address.');
    const code = String(Math.floor(100000 + Math.random() * 900000));
    sessionStorage.setItem(`reset_${email.toLowerCase()}`, JSON.stringify({ code, expires: Date.now() + 10 * 60 * 1000 }));
    console.info(`[Gyandeep] Password reset code for ${email}: ${code}`);
    return { ok: true, message: 'Reset code generated. Check browser console for demo.' };
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`
  });
  if (error) throw new Error(error.message);
  return { ok: true, message: 'Password reset email sent.' };
};

export const verifyPasswordReset = async (email: string, code: string) => {
  if (!isSupabaseConfigured()) {
    const raw = sessionStorage.getItem(`reset_${email.toLowerCase()}`);
    if (!raw) throw new Error('Invalid or expired code.');
    const entry = JSON.parse(raw);
    if (entry.code !== code || Date.now() > entry.expires) throw new Error('Invalid or expired code.');
    return { ok: true };
  }
  // With Supabase, password reset is handled via email link, not codes
  return { ok: true };
};

export const completePasswordReset = async (email: string, newPassword: string) => {
  if (!isSupabaseConfigured()) {
    const users: any[] = lsGet('gyandeep-users', []);
    lsSet('gyandeep-users', users.map(u =>
      u.email?.toLowerCase() === email.toLowerCase() ? { ...u, password: newPassword } : u
    ));
    sessionStorage.removeItem(`reset_${email.toLowerCase()}`);
    return { ok: true };
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw new Error(error.message);
  return { ok: true };
};

// ─── OTP ─────────────────────────────────────────────────────────────────────

export const sendOtp = async (userId: string) => {
  if (!isSupabaseConfigured()) {
    const code = String(Math.floor(100000 + Math.random() * 900000));
    sessionStorage.setItem(`otp_${userId}`, JSON.stringify({ code, expires: Date.now() + 5 * 60 * 1000 }));
    console.info(`[Gyandeep] OTP for ${userId}: ${code}`);
    return { ok: true };
  }

  // In Supabase, OTP is handled via auth.signInWithOtp
  // For custom OTP, we'd use a serverless function
  return { ok: true };
};

export const verifyOtp = async (userId: string, code: string) => {
  if (!isSupabaseConfigured()) {
    const raw = sessionStorage.getItem(`otp_${userId}`);
    if (!raw) throw new Error('Invalid or expired OTP.');
    const entry = JSON.parse(raw);
    if (entry.code !== code || Date.now() > entry.expires) throw new Error('Invalid or expired OTP.');
    sessionStorage.removeItem(`otp_${userId}`);
    return { ok: true };
  }
  return { ok: true };
};

// ─── Tag Presets ─────────────────────────────────────────────────────────────

const DEFAULT_TAG_PRESETS: Record<string, string[]> = {
  Mathematics: ['algebra', 'geometry', 'trigonometry', 'calculus', 'practice'],
  Science: ['physics', 'chemistry', 'biology', 'lab', 'experiment'],
  History: ['timeline', 'event', 'figure', 'cause', 'effect'],
  English: ['grammar', 'vocabulary', 'reading', 'writing', 'comprehension'],
};

export const fetchTagPresets = async () => {
  if (!isSupabaseConfigured()) return lsGet('gyandeep-tag-presets', DEFAULT_TAG_PRESETS);

  const { data, error } = await supabase.from('tag_presets').select('*');
  if (error) throw new Error(error.message);

  const result: Record<string, string[]> = { ...DEFAULT_TAG_PRESETS };
  for (const row of (data || [])) {
    result[row.subject] = row.tags;
  }
  return result;
};

export const updateTagPresets = async (subject: string, tags: string[]) => {
  if (!isSupabaseConfigured()) {
    const existing = lsGet<Record<string, string[]>>('gyandeep-tag-presets', DEFAULT_TAG_PRESETS);
    lsSet('gyandeep-tag-presets', { ...existing, [subject]: tags });
    return { ok: true };
  }

  const { error } = await supabase.from('tag_presets').upsert({ subject, tags });
  if (error) throw new Error(error.message);
  return { ok: true };
};

// ─── Grades ──────────────────────────────────────────────────────────────────

export const fetchGrades = async () => {
  if (!isSupabaseConfigured()) return lsGet('gyandeep-grades', []);

  const { data, error } = await supabase.from('grades').select('*');
  if (error) throw new Error(error.message);

  return (data || []).map(g => ({
    id: g.id,
    studentId: g.student_id,
    subject: g.subject,
    category: g.category,
    title: g.title,
    score: g.score,
    maxScore: g.max_score,
    weight: g.weight,
    date: g.date,
    teacherId: g.teacher_id
  }));
};

export const addGrade = async (grade: { studentId: string; subject: string; category: string; title: string; score: number; maxScore: number; weight?: number; date?: string; teacherId?: string }) => {
  const newGrade = { ...grade, id: `g_${Date.now()}`, date: grade.date || new Date().toISOString().split('T')[0] };

  if (!isSupabaseConfigured()) {
    const existing: any[] = lsGet('gyandeep-grades', []);
    lsSet('gyandeep-grades', [...existing, newGrade]);
    return newGrade;
  }

  const { error } = await supabase.from('grades').insert({
    id: newGrade.id,
    student_id: grade.studentId,
    subject: grade.subject,
    category: grade.category,
    title: grade.title,
    score: grade.score,
    max_score: grade.maxScore,
    weight: grade.weight || 1.0,
    date: newGrade.date,
    teacher_id: grade.teacherId
  });
  if (error) throw new Error(error.message);
  return newGrade;
};

export const addGradesBulk = async (grades: any[]) => {
  if (!isSupabaseConfigured()) {
    const existing: any[] = lsGet('gyandeep-grades', []);
    const newGrades = grades.map(g => ({ ...g, id: g.id || `g_${Date.now()}_${Math.random()}` }));
    lsSet('gyandeep-grades', [...existing, ...newGrades]);
    return { ok: true, count: grades.length };
  }

  const rows = grades.map(g => ({
    id: g.id || `g_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    student_id: g.studentId,
    subject: g.subject,
    category: g.category,
    title: g.title,
    score: g.score,
    max_score: g.maxScore,
    weight: g.weight || 1.0,
    date: g.date || new Date().toISOString().split('T')[0],
    teacher_id: g.teacherId
  }));

  const { error } = await supabase.from('grades').insert(rows);
  if (error) throw new Error(error.message);
  return { ok: true, count: grades.length };
};

export const deleteGrade = async (id: string) => {
  if (!isSupabaseConfigured()) {
    const existing: any[] = lsGet('gyandeep-grades', []);
    lsSet('gyandeep-grades', existing.filter(g => g.id !== id));
    return { ok: true };
  }

  const { error } = await supabase.from('grades').delete().eq('id', id);
  if (error) throw new Error(error.message);
  return { ok: true };
};

// ─── Timetable ───────────────────────────────────────────────────────────────

export const fetchTimetable = async () => {
  if (!isSupabaseConfigured()) return lsGet('gyandeep-timetable', []);

  const { data, error } = await supabase.from('timetable').select('*');
  if (error) throw new Error(error.message);

  return (data || []).map(e => ({
    id: e.id,
    day: e.day,
    startTime: e.start_time,
    endTime: e.end_time,
    subject: e.subject,
    teacherId: e.teacher_id,
    classId: e.class_id,
    room: e.room
  }));
};

export const saveTimetable = async (entries: any[]) => {
  if (!isSupabaseConfigured()) {
    lsSet('gyandeep-timetable', entries);
    return { ok: true };
  }

  // Replace all entries
  await supabase.from('timetable').delete().neq('id', '');
  if (entries.length > 0) {
    const rows = entries.map(e => ({
      id: e.id || `tt_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      day: e.day,
      start_time: e.startTime,
      end_time: e.endTime,
      subject: e.subject,
      teacher_id: e.teacherId,
      class_id: e.classId,
      room: e.room
    }));
    const { error } = await supabase.from('timetable').insert(rows);
    if (error) throw new Error(error.message);
  }
  return { ok: true };
};

export const addTimetableEntry = async (entry: any) => {
  const newEntry = { ...entry, id: `tt_${Date.now()}` };

  if (!isSupabaseConfigured()) {
    const existing: any[] = lsGet('gyandeep-timetable', []);
    lsSet('gyandeep-timetable', [...existing, newEntry]);
    return newEntry;
  }

  const { error } = await supabase.from('timetable').insert({
    id: newEntry.id,
    day: entry.day,
    start_time: entry.startTime,
    end_time: entry.endTime,
    subject: entry.subject,
    teacher_id: entry.teacherId,
    class_id: entry.classId,
    room: entry.room
  });
  if (error) throw new Error(error.message);
  return newEntry;
};

export const deleteTimetableEntry = async (id: string) => {
  if (!isSupabaseConfigured()) {
    const existing: any[] = lsGet('gyandeep-timetable', []);
    lsSet('gyandeep-timetable', existing.filter(e => e.id !== id));
    return { ok: true };
  }

  const { error } = await supabase.from('timetable').delete().eq('id', id);
  if (error) throw new Error(error.message);
  return { ok: true };
};

// ─── Tickets ─────────────────────────────────────────────────────────────────

export const fetchTickets = async () => {
  if (!isSupabaseConfigured()) return lsGet('gyandeep-tickets', []);

  const { data, error } = await supabase.from('tickets').select('*').order('created_at', { ascending: false });
  if (error) throw new Error(error.message);

  return (data || []).map(t => ({
    id: t.id,
    userId: t.user_id,
    userName: t.user_name,
    subject: t.subject,
    message: t.message,
    category: t.category,
    status: t.status,
    replies: t.replies || [],
    createdAt: t.created_at
  }));
};

export const createTicket = async (ticket: any) => {
  const newTicket = { ...ticket, id: `t_${Date.now()}`, status: 'open', createdAt: new Date().toISOString(), replies: [] };

  if (!isSupabaseConfigured()) {
    const existing: any[] = lsGet('gyandeep-tickets', []);
    lsSet('gyandeep-tickets', [newTicket, ...existing]);
    return newTicket;
  }

  const { error } = await supabase.from('tickets').insert({
    id: newTicket.id,
    user_id: ticket.userId,
    user_name: ticket.userName,
    subject: ticket.subject,
    message: ticket.message,
    category: ticket.category,
    status: 'open',
    replies: []
  });
  if (error) throw new Error(error.message);
  return newTicket;
};

export const replyToTicket = async (ticketId: string, reply: any) => {
  if (!isSupabaseConfigured()) {
    const tickets: any[] = lsGet('gyandeep-tickets', []);
    lsSet('gyandeep-tickets', tickets.map(t => t.id === ticketId
      ? { ...t, replies: [...(t.replies || []), { ...reply, id: `r_${Date.now()}`, createdAt: new Date().toISOString() }] }
      : t
    ));
    return { ok: true };
  }

  // Fetch current replies, append new one
  const { data: ticket } = await supabase.from('tickets').select('replies').eq('id', ticketId).single();
  const replies = [...(ticket?.replies || []), { ...reply, id: `r_${Date.now()}`, createdAt: new Date().toISOString() }];

  const { error } = await supabase.from('tickets').update({ replies }).eq('id', ticketId);
  if (error) throw new Error(error.message);
  return { ok: true };
};

export const closeTicket = async (ticketId: string) => {
  if (!isSupabaseConfigured()) {
    const tickets: any[] = lsGet('gyandeep-tickets', []);
    lsSet('gyandeep-tickets', tickets.map(t => t.id === ticketId ? { ...t, status: 'closed' } : t));
    return { ok: true };
  }

  const { error } = await supabase.from('tickets').update({ status: 'closed' }).eq('id', ticketId);
  if (error) throw new Error(error.message);
  return { ok: true };
};

// ─── Notifications ───────────────────────────────────────────────────────────

export const fetchNotifications = async (userId: string) => {
  if (!isSupabaseConfigured()) return lsGet(`gyandeep-notifications-${userId}`, []);

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .or(`user_id.eq.${userId},user_id.eq.all`)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  return (data || []).map(n => ({
    id: n.id,
    userId: n.user_id,
    title: n.title,
    message: n.message,
    type: n.type,
    read: n.read,
    createdAt: n.created_at
  }));
};

export const createNotification = async (notif: any) => {
  const newNotif = { ...notif, id: `n_${Date.now()}`, read: false, createdAt: new Date().toISOString() };

  if (!isSupabaseConfigured()) {
    const key = `gyandeep-notifications-${notif.userId || 'global'}`;
    const existing: any[] = lsGet(key, []);
    lsSet(key, [newNotif, ...existing]);
    return newNotif;
  }

  const { error } = await supabase.from('notifications').insert({
    id: newNotif.id,
    user_id: notif.userId || 'all',
    title: notif.title,
    message: notif.message,
    type: notif.type || 'info',
    read: false
  });
  if (error) throw new Error(error.message);
  return newNotif;
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
  const apiBase = import.meta.env.VITE_API_URL || '';
  try {
    const { data: session } = await supabase.auth.getSession();
    const token = session.session?.access_token;

    const res = await fetch(`${apiBase}/api/analytics-insights`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ studentData, type })
    });
    if (!res.ok) throw new Error('Failed to get insights');
    return res.json();
  } catch {
    return { insights: [] };
  }
};

// ─── Admin Override ──────────────────────────────────────────────────────────

export const adminOverride = async (adminId: string, userId: string, action: string, reason?: string) => {
  if (!isSupabaseConfigured()) {
    const log = { adminId, userId, action, reason, timestamp: new Date().toISOString() };
    const existing: any[] = lsGet('gyandeep-audit-log', []);
    lsSet('gyandeep-audit-log', [log, ...existing]);
    return { ok: true };
  }

  const { error } = await supabase.from('audit_logs').insert({
    type: 'admin_override',
    user_id: adminId,
    details: { targetUserId: userId, action, reason }
  });
  if (error) throw new Error(error.message);
  return { ok: true };
};

// ─── Webhooks ────────────────────────────────────────────────────────────────

export const fetchWebhooks = async () => {
  if (!isSupabaseConfigured()) return lsGet('gyandeep-webhooks', []);

  const { data, error } = await supabase.from('webhooks').select('*');
  if (error) throw new Error(error.message);
  return data || [];
};

export const createWebhook = async (webhook: any) => {
  const newHook = { ...webhook, id: `wh_${Date.now()}` };

  if (!isSupabaseConfigured()) {
    const existing: any[] = lsGet('gyandeep-webhooks', []);
    lsSet('gyandeep-webhooks', [...existing, newHook]);
    return newHook;
  }

  const { error } = await supabase.from('webhooks').insert(newHook);
  if (error) throw new Error(error.message);
  return newHook;
};

export const deleteWebhook = async (id: string) => {
  if (!isSupabaseConfigured()) {
    const existing: any[] = lsGet('gyandeep-webhooks', []);
    lsSet('gyandeep-webhooks', existing.filter(w => w.id !== id));
    return { ok: true };
  }

  const { error } = await supabase.from('webhooks').delete().eq('id', id);
  if (error) throw new Error(error.message);
  return { ok: true };
};

// ─── Email Verification ─────────────────────────────────────────────────────

export const sendEmailVerification = async (email: string) => {
  if (!isSupabaseConfigured()) return { ok: true, message: 'Email verification requires backend.' };
  // Supabase handles email verification automatically on signup
  return { ok: true };
};

export const checkEmailVerification = async (email: string, code: string) => {
  if (!isSupabaseConfigured()) return { ok: true };
  return { ok: true };
};
