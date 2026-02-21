/**
 * dataService.ts
 * 
 * All API calls gracefully fall back to localStorage when the backend is unavailable.
 * This makes the app fully functional in offline/local mode and ready for real backend integration.
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || ''

// ─── Utility ────────────────────────────────────────────────────────────────

const isNetworkError = (err: unknown): boolean =>
  err instanceof TypeError && (err.message === 'Failed to fetch' || err.message.includes('NetworkError'))

const tryFetch = async <T>(
  apiFn: () => Promise<T>,
  fallbackFn: () => T
): Promise<T> => {
  if (!API_BASE_URL) return fallbackFn()
  try {
    return await apiFn()
  } catch (err) {
    if (isNetworkError(err)) {
      console.warn('[dataService] Backend unavailable, using local fallback.')
      return fallbackFn()
    }
    throw err
  }
}

const lsGet = <T>(key: string, defaultValue: T): T => {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : defaultValue
  } catch { return defaultValue }
}

const lsSet = (key: string, value: unknown) => {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch (err) { console.warn('[dataService] localStorage set failed', err) }
}

// ─── Users ──────────────────────────────────────────────────────────────────

export const fetchUsers = async () =>
  tryFetch(
    async () => {
      const res = await fetch(`${API_BASE_URL}/api/users`)
      if (!res.ok) throw new Error('Failed to fetch users')
      return res.json()
    },
    () => lsGet('gyandeep-users', [])
  )

export const saveUsers = async (users: any[]) => {
  lsSet('gyandeep-users', users)
  if (!API_BASE_URL) return { ok: true }
  try {
    const res = await fetch(`${API_BASE_URL}/api/users/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(users)
    })
    if (!res.ok) throw new Error('Failed to save users')
    return res.json()
  } catch (err) {
    if (isNetworkError(err)) return { ok: true }
    throw err
  }
}

export const bulkImportUsers = async (users: any[]) => {
  // Merge into existing local users
  const existing: any[] = lsGet('gyandeep-users', [])
  const merged = [...existing]
  for (const u of users) {
    const idx = merged.findIndex(e => e.id === u.id)
    if (idx >= 0) merged[idx] = { ...merged[idx], ...u }
    else merged.push(u)
  }
  lsSet('gyandeep-users', merged)
  if (!API_BASE_URL) return { ok: true, count: users.length }
  try {
    const res = await fetch(`${API_BASE_URL}/api/users/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(users)
    })
    if (!res.ok) throw new Error('Failed to import users')
    return res.json()
  } catch (err) {
    if (isNetworkError(err)) return { ok: true, count: users.length }
    throw err
  }
}

// ─── Classes ─────────────────────────────────────────────────────────────────

export const fetchClasses = async () =>
  tryFetch(
    async () => {
      const res = await fetch(`${API_BASE_URL}/api/classes`)
      if (!res.ok) throw new Error('Failed to fetch classes')
      return res.json()
    },
    () => lsGet('gyandeep-classes', [])
  )

export const saveClasses = async (classes: any[]) => {
  lsSet('gyandeep-classes', classes)
  if (!API_BASE_URL) return { ok: true }
  try {
    const res = await fetch(`${API_BASE_URL}/api/classes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(classes)
    })
    if (!res.ok) throw new Error('Failed to save classes')
    return res.json()
  } catch (err) {
    if (isNetworkError(err)) return { ok: true }
    throw err
  }
}

export const assignStudentToClass = async (studentId: string, classId: string | null) => {
  // Local fallback: update the user's classId in localStorage
  const users: any[] = lsGet('gyandeep-users', [])
  const updated = users.map((u: any) => u.id === studentId ? { ...u, classId } : u)
  lsSet('gyandeep-users', updated)
  if (!API_BASE_URL) return { ok: true }
  try {
    const res = await fetch(`${API_BASE_URL}/api/classes/assign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId, classId })
    })
    if (!res.ok) throw new Error('Failed to assign student')
    return res.json()
  } catch (err) {
    if (isNetworkError(err)) return { ok: true }
    throw err
  }
}

// ─── Notes ──────────────────────────────────────────────────────────────────

export const uploadClassNotes = async (params: { classId: string; subjectId: string; content: string }) => {
  // Always save locally
  const key = `notes_${params.classId}_${params.subjectId}`
  lsSet(key, { content: params.content, updatedAt: new Date().toISOString() })
  if (!API_BASE_URL) return { url: `local://${key}` }
  try {
    const res = await fetch(`${API_BASE_URL}/api/notes/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    })
    if (!res.ok) throw new Error('Failed to upload notes')
    return res.json() as Promise<{ url: string }>
  } catch (err) {
    if (isNetworkError(err)) return { url: `local://${key}` }
    throw err
  }
}

export const listClassNotes = async (params: { classId: string; subjectId: string }) =>
  tryFetch(
    async () => {
      const url = `${API_BASE_URL}/api/notes/list?classId=${encodeURIComponent(params.classId)}&subjectId=${encodeURIComponent(params.subjectId)}`
      const res = await fetch(url)
      if (!res.ok) throw new Error('Failed to list notes')
      return res.json() as Promise<Array<{ url: string; name: string }>>
    },
    () => []
  )

// ─── Question Bank ──────────────────────────────────────────────────────────

export const fetchQuestionBank = async () =>
  tryFetch(
    async () => {
      const res = await fetch(`${API_BASE_URL}/api/question-bank`)
      if (!res.ok) throw new Error('Failed to fetch question bank')
      return res.json()
    },
    () => lsGet('gyandeep-question-bank', [])
  )

export const addQuestionsToBank = async (questions: any[]) => {
  const existing: any[] = lsGet('gyandeep-question-bank', [])
  lsSet('gyandeep-question-bank', [...existing, ...questions])
  if (!API_BASE_URL) return { ok: true }
  try {
    const res = await fetch(`${API_BASE_URL}/api/question-bank/add`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ questions })
    })
    if (!res.ok) throw new Error('Failed to add questions')
    return res.json()
  } catch (err) { if (isNetworkError(err)) return { ok: true }; throw err }
}

export const upsertQuizToBank = async (quiz: any[], subject: string) => {
  const existing: any[] = lsGet('gyandeep-question-bank', [])
  const withSubject = quiz.map(q => ({ ...q, subject }))
  const merged = [...existing.filter((q: any) => q.subject !== subject), ...withSubject]
  lsSet('gyandeep-question-bank', merged)
  if (!API_BASE_URL) return { ok: true }
  try {
    const res = await fetch(`${API_BASE_URL}/api/question-bank/upsert-quiz`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ quiz, subject })
    })
    if (!res.ok) throw new Error('Failed to upsert quiz')
    return res.json()
  } catch (err) { if (isNetworkError(err)) return { ok: true }; throw err }
}

export const updateQuestionInBank = async (id: string, patch: any) => {
  const existing: any[] = lsGet('gyandeep-question-bank', [])
  lsSet('gyandeep-question-bank', existing.map((q: any) => q.id === id ? { ...q, ...patch } : q))
  if (!API_BASE_URL) return { ok: true }
  try {
    const res = await fetch(`${API_BASE_URL}/api/question-bank/update`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, patch })
    })
    if (!res.ok) throw new Error('Failed to update question')
    return res.json()
  } catch (err) { if (isNetworkError(err)) return { ok: true }; throw err }
}

export const deleteQuestionFromBank = async (id: string) => {
  const existing: any[] = lsGet('gyandeep-question-bank', [])
  lsSet('gyandeep-question-bank', existing.filter((q: any) => q.id !== id))
  if (!API_BASE_URL) return { ok: true }
  try {
    const res = await fetch(`${API_BASE_URL}/api/question-bank/${id}`, { method: 'DELETE' })
    if (!res.ok) throw new Error('Failed to delete question')
    return res.json()
  } catch (err) { if (isNetworkError(err)) return { ok: true }; throw err }
}

// ─── Password Reset (client-side fallback) ──────────────────────────────────

// In-memory store for reset codes (session only – real app should use backend)
const resetCodes = new Map<string, { code: string; expires: number }>()

export const requestPasswordReset = async (email: string) => {
  if (!API_BASE_URL) {
    // Verify user exists
    const users: any[] = lsGet('gyandeep-users', [])
    const user = users.find((u: any) => u.email?.toLowerCase() === email.toLowerCase())
    if (!user) throw new Error('No account found with that email address.')
    // Generate a 6-digit code (displayed in console for demo; real app emails it)
    const code = String(Math.floor(100000 + Math.random() * 900000))
    resetCodes.set(email.toLowerCase(), { code, expires: Date.now() + 10 * 60 * 1000 })
    console.info(`[Gyandeep] Password reset code for ${email}: ${code}`)
    return { ok: true, message: 'Reset code generated. Check browser console for demo.' }
  }
  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/password/request`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email })
    })
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed to request reset')
    return res.json()
  } catch (err) { if (isNetworkError(err)) return requestPasswordReset(email); throw err }
}

export const verifyPasswordReset = async (email: string, code: string) => {
  if (!API_BASE_URL) {
    const entry = resetCodes.get(email.toLowerCase())
    if (!entry || entry.code !== code || Date.now() > entry.expires)
      throw new Error('Invalid or expired code.')
    return { ok: true }
  }
  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/password/verify`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, code })
    })
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed to verify code')
    return res.json()
  } catch (err) { if (isNetworkError(err)) return verifyPasswordReset(email, code); throw err }
}

export const completePasswordReset = async (email: string, newPassword: string) => {
  if (!API_BASE_URL) {
    const users: any[] = lsGet('gyandeep-users', [])
    const updated = users.map((u: any) =>
      u.email?.toLowerCase() === email.toLowerCase() ? { ...u, password: newPassword } : u
    )
    lsSet('gyandeep-users', updated)
    resetCodes.delete(email.toLowerCase())
    return { ok: true }
  }
  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/password/complete`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, newPassword })
    })
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed to reset password')
    return res.json()
  } catch (err) { if (isNetworkError(err)) return completePasswordReset(email, newPassword); throw err }
}

// ─── OTP ────────────────────────────────────────────────────────────────────

export const sendOtp = async (userId: string) => {
  if (!API_BASE_URL) {
    const code = String(Math.floor(100000 + Math.random() * 900000))
    resetCodes.set(`otp_${userId}`, { code, expires: Date.now() + 5 * 60 * 1000 })
    console.info(`[Gyandeep] OTP for ${userId}: ${code}`)
    return { ok: true }
  }
  const res = await fetch(`${API_BASE_URL}/api/auth/otp/send`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId })
  })
  if (!res.ok) throw new Error('Failed to send OTP')
  return res.json()
}

export const verifyOtp = async (userId: string, code: string) => {
  if (!API_BASE_URL) {
    const entry = resetCodes.get(`otp_${userId}`)
    if (!entry || entry.code !== code || Date.now() > entry.expires) throw new Error('Invalid or expired OTP.')
    resetCodes.delete(`otp_${userId}`)
    return { ok: true }
  }
  const res = await fetch(`${API_BASE_URL}/api/auth/otp/verify`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, code })
  })
  if (!res.ok) throw new Error('Failed to verify OTP')
  return res.json()
}

// ─── Tag Presets ────────────────────────────────────────────────────────────

const DEFAULT_TAG_PRESETS: Record<string, string[]> = {
  Mathematics: ['algebra', 'geometry', 'trigonometry', 'calculus', 'practice'],
  Science: ['physics', 'chemistry', 'biology', 'lab', 'experiment'],
  History: ['timeline', 'event', 'figure', 'cause', 'effect'],
  English: ['grammar', 'vocabulary', 'reading', 'writing', 'comprehension'],
}

export const fetchTagPresets = async () =>
  tryFetch(
    async () => {
      const res = await fetch(`${API_BASE_URL}/api/tags-presets`)
      if (!res.ok) throw new Error('Failed to fetch tag presets')
      return res.json()
    },
    () => lsGet('gyandeep-tag-presets', DEFAULT_TAG_PRESETS)
  )

export const updateTagPresets = async (subject: string, tags: string[]) => {
  const existing = lsGet<Record<string, string[]>>('gyandeep-tag-presets', DEFAULT_TAG_PRESETS)
  lsSet('gyandeep-tag-presets', { ...existing, [subject]: tags })
  if (!API_BASE_URL) return { ok: true }
  try {
    const res = await fetch(`${API_BASE_URL}/api/tags-presets/update`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subject, tags })
    })
    if (!res.ok) throw new Error('Failed to update tag presets')
    return res.json()
  } catch (err) { if (isNetworkError(err)) return { ok: true }; throw err }
}

// ─── Grades ─────────────────────────────────────────────────────────────────

export const fetchGrades = async () =>
  tryFetch(
    async () => {
      const res = await fetch(`${API_BASE_URL}/api/grades`)
      if (!res.ok) throw new Error('Failed to fetch grades')
      return res.json()
    },
    () => lsGet('gyandeep-grades', [])
  )

export const addGrade = async (grade: { studentId: string; subject: string; category: string; title: string; score: number; maxScore: number; weight?: number; date?: string; teacherId?: string }) => {
  const existing: any[] = lsGet('gyandeep-grades', [])
  const newGrade = { ...grade, id: `g_${Date.now()}`, date: grade.date || new Date().toISOString().split('T')[0] }
  lsSet('gyandeep-grades', [...existing, newGrade])
  if (!API_BASE_URL) return newGrade
  try {
    const res = await fetch(`${API_BASE_URL}/api/grades`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(grade)
    })
    if (!res.ok) throw new Error('Failed to add grade')
    return res.json()
  } catch (err) { if (isNetworkError(err)) return newGrade; throw err }
}

export const addGradesBulk = async (grades: any[]) => {
  const existing: any[] = lsGet('gyandeep-grades', [])
  const newGrades = grades.map(g => ({ ...g, id: g.id || `g_${Date.now()}_${Math.random()}` }))
  lsSet('gyandeep-grades', [...existing, ...newGrades])
  if (!API_BASE_URL) return { ok: true, count: grades.length }
  try {
    const res = await fetch(`${API_BASE_URL}/api/grades/bulk`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ grades })
    })
    if (!res.ok) throw new Error('Failed to add grades')
    return res.json()
  } catch (err) { if (isNetworkError(err)) return { ok: true }; throw err }
}

export const deleteGrade = async (id: string) => {
  const existing: any[] = lsGet('gyandeep-grades', [])
  lsSet('gyandeep-grades', existing.filter((g: any) => g.id !== id))
  if (!API_BASE_URL) return { ok: true }
  try {
    const res = await fetch(`${API_BASE_URL}/api/grades/${id}`, { method: 'DELETE' })
    if (!res.ok) throw new Error('Failed to delete grade')
    return res.json()
  } catch (err) { if (isNetworkError(err)) return { ok: true }; throw err }
}

// ─── Timetable ──────────────────────────────────────────────────────────────

export const fetchTimetable = async () =>
  tryFetch(
    async () => {
      const res = await fetch(`${API_BASE_URL}/api/timetable`)
      if (!res.ok) throw new Error('Failed to fetch timetable')
      return res.json()
    },
    () => lsGet('gyandeep-timetable', [])
  )

export const saveTimetable = async (entries: any[]) => {
  lsSet('gyandeep-timetable', entries)
  if (!API_BASE_URL) return { ok: true }
  try {
    const res = await fetch(`${API_BASE_URL}/api/timetable`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(entries)
    })
    if (!res.ok) throw new Error('Failed to save timetable')
    return res.json()
  } catch (err) { if (isNetworkError(err)) return { ok: true }; throw err }
}

export const addTimetableEntry = async (entry: any) => {
  const existing: any[] = lsGet('gyandeep-timetable', [])
  const newEntry = { ...entry, id: `tt_${Date.now()}` }
  lsSet('gyandeep-timetable', [...existing, newEntry])
  if (!API_BASE_URL) return newEntry
  try {
    const res = await fetch(`${API_BASE_URL}/api/timetable/entry`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(entry)
    })
    if (!res.ok) throw new Error('Failed to add timetable entry')
    return res.json()
  } catch (err) { if (isNetworkError(err)) return newEntry; throw err }
}

export const deleteTimetableEntry = async (id: string) => {
  const existing: any[] = lsGet('gyandeep-timetable', [])
  lsSet('gyandeep-timetable', existing.filter((e: any) => e.id !== id))
  if (!API_BASE_URL) return { ok: true }
  try {
    const res = await fetch(`${API_BASE_URL}/api/timetable/${id}`, { method: 'DELETE' })
    if (!res.ok) throw new Error('Failed to delete entry')
    return res.json()
  } catch (err) { if (isNetworkError(err)) return { ok: true }; throw err }
}

// ─── Tickets ────────────────────────────────────────────────────────────────

export const fetchTickets = async () =>
  tryFetch(
    async () => {
      const res = await fetch(`${API_BASE_URL}/api/tickets`)
      if (!res.ok) throw new Error('Failed to fetch tickets')
      return res.json()
    },
    () => lsGet('gyandeep-tickets', [])
  )

export const createTicket = async (ticket: any) => {
  const newTicket = { ...ticket, id: `t_${Date.now()}`, status: 'open', createdAt: new Date().toISOString(), replies: [] }
  const existing: any[] = lsGet('gyandeep-tickets', [])
  lsSet('gyandeep-tickets', [newTicket, ...existing])
  if (!API_BASE_URL) return newTicket
  try {
    const res = await fetch(`${API_BASE_URL}/api/tickets`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(ticket)
    })
    if (!res.ok) throw new Error('Failed to create ticket')
    return res.json()
  } catch (err) { if (isNetworkError(err)) return newTicket; throw err }
}

export const replyToTicket = async (ticketId: string, reply: any) => {
  const tickets: any[] = lsGet('gyandeep-tickets', [])
  const updated = tickets.map((t: any) => t.id === ticketId
    ? { ...t, replies: [...(t.replies || []), { ...reply, id: `r_${Date.now()}`, createdAt: new Date().toISOString() }] }
    : t
  )
  lsSet('gyandeep-tickets', updated)
  if (!API_BASE_URL) return { ok: true }
  try {
    const res = await fetch(`${API_BASE_URL}/api/tickets/${ticketId}/reply`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(reply)
    })
    if (!res.ok) throw new Error('Failed to reply')
    return res.json()
  } catch (err) { if (isNetworkError(err)) return { ok: true }; throw err }
}

export const closeTicket = async (ticketId: string) => {
  const tickets: any[] = lsGet('gyandeep-tickets', [])
  lsSet('gyandeep-tickets', tickets.map((t: any) => t.id === ticketId ? { ...t, status: 'closed' } : t))
  if (!API_BASE_URL) return { ok: true }
  try {
    const res = await fetch(`${API_BASE_URL}/api/tickets/${ticketId}/close`, { method: 'POST' })
    if (!res.ok) throw new Error('Failed to close ticket')
    return res.json()
  } catch (err) { if (isNetworkError(err)) return { ok: true }; throw err }
}

// ─── Notifications ──────────────────────────────────────────────────────────

export const fetchNotifications = async (userId: string) =>
  tryFetch(
    async () => {
      const res = await fetch(`${API_BASE_URL}/api/notifications?userId=${encodeURIComponent(userId)}`)
      if (!res.ok) throw new Error('Failed to fetch notifications')
      return res.json()
    },
    () => lsGet(`gyandeep-notifications-${userId}`, [])
  )

export const createNotification = async (notif: any) => {
  const key = `gyandeep-notifications-${notif.userId || 'global'}`
  const existing: any[] = lsGet(key, [])
  const newNotif = { ...notif, id: `n_${Date.now()}`, read: false, createdAt: new Date().toISOString() }
  lsSet(key, [newNotif, ...existing])
  if (!API_BASE_URL) return newNotif
  try {
    const res = await fetch(`${API_BASE_URL}/api/notifications`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(notif)
    })
    if (!res.ok) throw new Error('Failed to create notification')
    return res.json()
  } catch (err) { if (isNetworkError(err)) return newNotif; throw err }
}

// ─── Integrations (stubs with graceful fallback) ────────────────────────────

export const syncCalendar = async (title: string, start: string, end: string) => {
  if (!API_BASE_URL) return { ok: true, message: 'Calendar sync is not available in offline mode.' }
  try {
    const res = await fetch(`${API_BASE_URL}/api/integrations/calendar/sync`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title, start, end })
    })
    if (!res.ok) throw new Error('Calendar sync failed')
    return res.json()
  } catch (err) { if (isNetworkError(err)) return { ok: false, message: 'Backend unavailable.' }; throw err }
}

export const uploadToDrive = async (name: string, url: string) => {
  if (!API_BASE_URL) return { ok: true, message: 'Drive upload is not available in offline mode.' }
  try {
    const res = await fetch(`${API_BASE_URL}/api/integrations/drive/upload`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, url })
    })
    if (!res.ok) throw new Error('Drive upload failed')
    return res.json()
  } catch (err) { if (isNetworkError(err)) return { ok: false, message: 'Backend unavailable.' }; throw err }
}

// ─── Analytics ──────────────────────────────────────────────────────────────

export const getAnalyticsInsights = async (studentData: any, type?: string) => {
  if (!API_BASE_URL) return { insights: [], message: 'Analytics requires backend.' }
  try {
    const res = await fetch(`${API_BASE_URL}/api/analytics/insights`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ studentData, type })
    })
    if (!res.ok) throw new Error('Failed to get insights')
    return res.json()
  } catch (err) { if (isNetworkError(err)) return { insights: [] }; throw err }
}

// ─── Admin Override ──────────────────────────────────────────────────────────

export const adminOverride = async (adminId: string, userId: string, action: string, reason?: string) => {
  const log = { adminId, userId, action, reason, timestamp: new Date().toISOString() }
  const existing: any[] = lsGet('gyandeep-audit-log', [])
  lsSet('gyandeep-audit-log', [log, ...existing])
  if (!API_BASE_URL) return { ok: true }
  try {
    const res = await fetch(`${API_BASE_URL}/api/admin/override`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(log)
    })
    if (!res.ok) throw new Error('Failed to record override')
    return res.json()
  } catch (err) { if (isNetworkError(err)) return { ok: true }; throw err }
}

// ─── Webhooks ────────────────────────────────────────────────────────────────

export const fetchWebhooks = async () =>
  tryFetch(
    async () => {
      const res = await fetch(`${API_BASE_URL}/api/webhooks`)
      if (!res.ok) throw new Error('Failed to fetch webhooks')
      return res.json()
    },
    () => lsGet('gyandeep-webhooks', [])
  )

export const createWebhook = async (webhook: any) => {
  const newHook = { ...webhook, id: `wh_${Date.now()}` }
  const existing: any[] = lsGet('gyandeep-webhooks', [])
  lsSet('gyandeep-webhooks', [...existing, newHook])
  if (!API_BASE_URL) return newHook
  try {
    const res = await fetch(`${API_BASE_URL}/api/webhooks`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(webhook)
    })
    if (!res.ok) throw new Error('Failed to create webhook')
    return res.json()
  } catch (err) { if (isNetworkError(err)) return newHook; throw err }
}

export const deleteWebhook = async (id: string) => {
  const existing: any[] = lsGet('gyandeep-webhooks', [])
  lsSet('gyandeep-webhooks', existing.filter((w: any) => w.id !== id))
  if (!API_BASE_URL) return { ok: true }
  try {
    const res = await fetch(`${API_BASE_URL}/api/webhooks/${id}`, { method: 'DELETE' })
    if (!res.ok) throw new Error('Failed to delete webhook')
    return res.json()
  } catch (err) { if (isNetworkError(err)) return { ok: true }; throw err }
}

// ─── Email Verification ──────────────────────────────────────────────────────

export const sendEmailVerification = async (email: string) => {
  if (!API_BASE_URL) return { ok: true, message: 'Email verification requires backend.' }
  const res = await fetch(`${API_BASE_URL}/api/auth/email/verify-send`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email })
  })
  if (!res.ok) throw new Error('Failed to send verification email')
  return res.json()
}

export const checkEmailVerification = async (email: string, code: string) => {
  if (!API_BASE_URL) return { ok: true }
  const res = await fetch(`${API_BASE_URL}/api/auth/email/verify-check`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, code })
  })
  if (!res.ok) throw new Error('Failed to verify email')
  return res.json()
}
