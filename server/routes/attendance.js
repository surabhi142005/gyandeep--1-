/**
 * server/routes/attendance.js
 *
 * POST /api/attendance/session      — teacher creates a session (stores code in Redis)
 * POST /api/attendance/mark         — student marks attendance (buffered write)
 * GET  /api/attendance/session/:id  — get session attendance records
 * GET  /api/attendance/review       — admin review list
 * POST /api/attendance/review/flag  — flag an attendance record
 * POST /api/attendance/review/resolve — resolve a flagged record
 */

import { Router } from 'express'
import fs from 'fs'
import path from 'path'
import { requireAuth } from '../middleware/requireAuth.js'
import { ensureRole } from '../middleware/rbac.js'
import { asyncRoute } from '../middleware/validate.js'
import { setSessionCode, getSessionCode, deleteSessionCode, bufferAttendance, isStudentInBuffer } from '../services/redisService.js'
import { run as dbRun, all as dbAll, get as dbGet } from '../database.js'

const router = Router()
const dataDir = path.join(process.cwd(), 'server', 'data')
const attendanceReviewFile = path.join(dataDir, 'attendance_review.json')
const auditLogFile = path.join(dataDir, 'audit.json')

function ensureDataDir() {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true })
}

// Helper: append to audit log
async function auditLog(entry) {
  try {
    await dbRun(`INSERT INTO audit_logs (ts, type, userId, details) VALUES (?,?,?,?)`,
      [entry.ts || Date.now(), entry.type, entry.userId || null, JSON.stringify(entry)])
  } catch {
    // fallback to file
    try {
      ensureDataDir()
      const existing = fs.existsSync(auditLogFile) ? JSON.parse(fs.readFileSync(auditLogFile, 'utf8') || '[]') : []
      existing.push(entry)
      fs.writeFileSync(auditLogFile, JSON.stringify(existing, null, 2))
    } catch {}
  }
}

// ── Teacher: create session with code ─────────────────────────────────────────
router.post('/session', requireAuth, ensureRole('teacher', 'admin'), asyncRoute(async (req, res) => {
  const { classId, subjectId, teacherLat, teacherLng, radiusM = 100, durationSecs = 600, notes } = req.body || {}
  if (!classId) return res.status(400).json({ error: 'classId is required' })

  // Generate a 6-character alphanumeric code
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)]

  const sessionData = {
    sessionId: `sess-${Date.now()}`,
    classId,
    subjectId: subjectId || null,
    teacherLat: typeof teacherLat === 'number' ? teacherLat : null,
    teacherLng: typeof teacherLng === 'number' ? teacherLng : null,
    radiusM,
    createdAt: Date.now(),
    expiresAt: Date.now() + durationSecs * 1000,
    teacherId: req.user.id,
    notes: notes || null,
  }

  await setSessionCode(code, sessionData, durationSecs)

  return res.json({ ok: true, code, session: sessionData })
}))

// ── Student: mark attendance ──────────────────────────────────────────────────
router.post('/mark', requireAuth, asyncRoute(async (req, res) => {
  const { code, studentLat, studentLng } = req.body || {}
  if (!code) return res.status(400).json({ error: 'code is required' })

  const session = await getSessionCode(String(code).toUpperCase())
  if (!session) return res.status(404).json({ error: 'Invalid or expired session code' })
  if (session.expiresAt < Date.now()) {
    await deleteSessionCode(code)
    return res.status(410).json({ error: 'Session code has expired' })
  }

  // Verify the student is enrolled in the class that owns this session.
  // Prevents a student who obtained a code from marking attendance for a
  // class they are not enrolled in.
  try {
    const student = await dbGet(`SELECT classId FROM users WHERE id = ?`, [req.user.id])
    if (student && student.classId && session.classId && student.classId !== session.classId) {
      return res.status(403).json({ error: 'You are not enrolled in this class' })
    }
  } catch { /* DB unavailable — allow mark to proceed */ }

  // Server-side geofencing (never trust client alone)
  if (session.teacherLat !== null && typeof studentLat === 'number' && typeof studentLng === 'number') {
    const R = 6371000
    const dLat = (session.teacherLat - studentLat) * Math.PI / 180
    const dLng  = (session.teacherLng  - studentLng)  * Math.PI / 180
    const a = Math.sin(dLat/2)**2 +
      Math.cos(studentLat * Math.PI/180) * Math.cos(session.teacherLat * Math.PI/180) * Math.sin(dLng/2)**2
    const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    if (dist > session.radiusM) {
      return res.status(403).json({ error: 'You are outside the allowed attendance radius', distance: Math.round(dist) })
    }
  }

  // Buffer the write — responds in ~1 ms; flushed to DB every 5 s.
  // bufferAttendance returns false if this student already marked for this
  // session in the current flush window (idempotency dedup).
  const buffered = await bufferAttendance({
    sessionId: session.sessionId,
    studentId: req.user.id,
    studentName: req.user.name || req.user.email,
    classId: session.classId,
    subjectId: session.subjectId,
    status: 'present',
    geoLat: studentLat || null,
    geoLng: studentLng || null,
    verifiedAt: new Date().toISOString(),
  })

  if (!buffered) {
    // Already marked — idempotent success (not an error)
    return res.json({ ok: true, alreadyMarked: true, session: { classId: session.classId, subjectId: session.subjectId } })
  }

  return res.json({ ok: true, session: { classId: session.classId, subjectId: session.subjectId } })
}))

// ── Get attendance records for a session ─────────────────────────────────────
router.get('/session/:sessionId', requireAuth, ensureRole('teacher', 'admin'), asyncRoute(async (req, res) => {
  const { sessionId } = req.params
  try {
    const rows = await dbAll(`SELECT * FROM attendance WHERE session_id = ?`, [sessionId])
    return res.json(rows || [])
  } catch {
    return res.json([])
  }
}))

// ── Admin: attendance review ──────────────────────────────────────────────────
router.get('/review', requireAuth, ensureRole('admin'), asyncRoute(async (req, res) => {
  if (!fs.existsSync(attendanceReviewFile)) return res.json([])
  return res.json(JSON.parse(fs.readFileSync(attendanceReviewFile, 'utf8') || '[]'))
}))

router.post('/review/flag', requireAuth, ensureRole('teacher', 'admin'), asyncRoute(async (req, res) => {
  const { attendanceId, studentId, studentName, reason, adminId } = req.body || {}
  if (!studentId || !reason) return res.status(400).json({ error: 'studentId and reason are required' })
  ensureDataDir()
  const existing = fs.existsSync(attendanceReviewFile) ? JSON.parse(fs.readFileSync(attendanceReviewFile, 'utf8') || '[]') : []
  const entry = {
    id: `ar-${Date.now()}`, attendanceId: attendanceId || `att-${Date.now()}`,
    studentId, studentName: studentName || 'Unknown', reason,
    status: 'pending', adminId: adminId || req.user.id,
    flaggedAt: new Date().toISOString(), resolvedAt: null, notes: '',
  }
  existing.push(entry)
  fs.writeFileSync(attendanceReviewFile, JSON.stringify(existing, null, 2))
  await auditLog({ type: 'attendance_flagged', userId: req.user.id, studentId, reason })
  return res.json({ ok: true, entry })
}))

router.post('/review/resolve', requireAuth, ensureRole('admin'), asyncRoute(async (req, res) => {
  const { id, status, notes } = req.body || {}
  if (!id || !['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'id and status (approved|rejected) required' })
  }
  ensureDataDir()
  const existing = fs.existsSync(attendanceReviewFile) ? JSON.parse(fs.readFileSync(attendanceReviewFile, 'utf8') || '[]') : []
  const idx = existing.findIndex(e => e.id === id)
  if (idx === -1) return res.status(404).json({ error: 'Review entry not found' })
  existing[idx] = { ...existing[idx], status, adminId: req.user.id, notes: notes || '', resolvedAt: new Date().toISOString() }
  fs.writeFileSync(attendanceReviewFile, JSON.stringify(existing, null, 2))
  await auditLog({ type: 'attendance_resolved', userId: req.user.id, reviewId: id, status })
  return res.json({ ok: true, entry: existing[idx] })
}))

export default router
