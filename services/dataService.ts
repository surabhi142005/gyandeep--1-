export const bulkImportUsers = async (users: any[]) => {
  const res = await fetch('/api/users/bulk', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(users)
  })
  if (!res.ok) {
    const j = await res.json().catch(() => ({}))
    throw new Error(j.error || 'Failed to import users')
  }
  return res.json()
}

export const fetchUsers = async () => {
  const res = await fetch('/api/users')
  if (!res.ok) {
    const j = await res.json().catch(() => ({}))
    throw new Error(j.error || 'Failed to fetch users')
  }
  return res.json()
}

export const uploadClassNotes = async (params: { classId: string; subjectId: string; content: string }) => {
  const res = await fetch('/api/notes/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  })
  if (!res.ok) {
    const j = await res.json().catch(() => ({}))
    throw new Error(j.error || 'Failed to upload notes')
  }
  return res.json() as Promise<{ url: string }>
}

export const listClassNotes = async (params: { classId: string; subjectId: string }) => {
  const url = `/api/notes/list?classId=${encodeURIComponent(params.classId)}&subjectId=${encodeURIComponent(params.subjectId)}`
  const res = await fetch(url)
  if (!res.ok) {
    const j = await res.json().catch(() => ({}))
    throw new Error(j.error || 'Failed to list notes')
  }
  return res.json() as Promise<Array<{ url: string; name: string }>>
}

export const fetchClasses = async () => {
  const res = await fetch('/api/classes')
  if (!res.ok) {
    const j = await res.json().catch(() => ({}))
    throw new Error(j.error || 'Failed to fetch classes')
  }
  return res.json()
}

export const saveClasses = async (classes: any[]) => {
  const res = await fetch('/api/classes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(classes)
  })
  if (!res.ok) {
    const j = await res.json().catch(() => ({}))
    throw new Error(j.error || 'Failed to save classes')
  }
  return res.json()
}

export const assignStudentToClass = async (studentId: string, classId: string | null) => {
  const res = await fetch('/api/classes/assign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ studentId, classId })
  })
  if (!res.ok) {
    const j = await res.json().catch(() => ({}))
    throw new Error(j.error || 'Failed to assign student to class')
  }
  return res.json()
}

// Question Bank
export const fetchQuestionBank = async () => {
  const res = await fetch('/api/question-bank')
  if (!res.ok) {
    const j = await res.json().catch(() => ({}))
    throw new Error(j.error || 'Failed to fetch question bank')
  }
  return res.json()
}

export const addQuestionsToBank = async (questions: any[]) => {
  const res = await fetch('/api/question-bank/add', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ questions })
  })
  if (!res.ok) {
    const j = await res.json().catch(() => ({}))
    throw new Error(j.error || 'Failed to add questions')
  }
  return res.json()
}

export const upsertQuizToBank = async (quiz: any[], subject: string) => {
  const res = await fetch('/api/question-bank/upsert-quiz', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ quiz, subject })
  })
  if (!res.ok) {
    const j = await res.json().catch(() => ({}))
    throw new Error(j.error || 'Failed to upsert quiz')
  }
  return res.json()
}

export const updateQuestionInBank = async (id: string, patch: any) => {
  const res = await fetch('/api/question-bank/update', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, patch }) })
  if (!res.ok) {
    const j = await res.json().catch(() => ({}))
    throw new Error(j.error || 'Failed to update question')
  }
  return res.json()
}

export const deleteQuestionFromBank = async (id: string) => {
  const res = await fetch(`/api/question-bank/${id}`, { method: 'DELETE' })
  if (!res.ok) {
    const j = await res.json().catch(() => ({}))
    throw new Error(j.error || 'Failed to delete question')
  }
  return res.json()
}

// OTP MFA
export const sendOtp = async (userId: string) => {
  const res = await fetch('/api/auth/otp/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId }) })
  if (!res.ok) {
    const j = await res.json().catch(() => ({}))
    throw new Error(j.error || 'Failed to send OTP')
  }
  return res.json()
}

export const verifyOtp = async (userId: string, code: string) => {
  const res = await fetch('/api/auth/otp/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, code }) })
  if (!res.ok) {
    const j = await res.json().catch(() => ({}))
    throw new Error(j.error || 'Failed to verify OTP')
  }
  return res.json()
}

// Admin override audit
export const adminOverride = async (adminId: string, userId: string, action: string, reason?: string) => {
  const res = await fetch('/api/admin/override', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ adminId, userId, action, reason }) })
  if (!res.ok) {
    const j = await res.json().catch(() => ({}))
    throw new Error(j.error || 'Failed to record override')
  }
  return res.json()
}

// Integrations stubs
export const syncCalendar = async (title: string, start: string, end: string) => {
  const res = await fetch('/api/integrations/calendar/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title, start, end }) })
  if (!res.ok) {
    const j = await res.json().catch(() => ({}))
    throw new Error(j.error || 'Calendar sync failed')
  }
  return res.json()
}

export const uploadToDrive = async (name: string, url: string) => {
  const res = await fetch('/api/integrations/drive/upload', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, url }) })
  if (!res.ok) {
    const j = await res.json().catch(() => ({}))
    throw new Error(j.error || 'Drive upload failed')
  }
  return res.json()
}

// Tag presets
export const fetchTagPresets = async () => {
  const res = await fetch('/api/tags-presets')
  if (!res.ok) {
    const j = await res.json().catch(() => ({}))
    throw new Error(j.error || 'Failed to fetch tag presets')
  }
  return res.json()
}

export const updateTagPresets = async (subject: string, tags: string[]) => {
  const res = await fetch('/api/tags-presets/update', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subject, tags }) })
  if (!res.ok) {
    const j = await res.json().catch(() => ({}))
    throw new Error(j.error || 'Failed to update tag presets')
  }
  return res.json()
}