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