/**
 * server/index.js — Gyandeep API Server (refactored)
 *
 * Architecture:
 *   server/routes/      — route definitions (thin)
 *   server/controllers/ — business logic
 *   server/middleware/  — auth, rbac, rate-limiting, validation
 *   server/services/    — redis, llm adapter
 *   server/db/          — PostgreSQL pool (optional)
 */

import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import http from 'http'
import path from 'path'
import fs from 'fs'
import session from 'express-session'
import passport from 'passport'
import jwt from 'jsonwebtoken'
import { Strategy as GoogleStrategy } from 'passport-google-oauth20'

import { initDB, setupSchema } from './database.js'
import { addJob, getJob, registerProcessor, isRedisMode } from './jobQueue.js'
import { indexContent, semanticSearch, buildContext, indexStats } from './embeddings.js'
import { registerAttendanceFlusher, flushAttendanceNow } from './services/redisService.js'
import { registerWeeklyInsightsCron } from './cron/weeklyInsights.js'
import { getLLMService } from './services/llmService.js'
import { generalRateLimit, aiRateLimit } from './middleware/rateLimiter.js'
import { metricsMiddleware, attendanceQueueDepth, attendanceFlushLagMs, register } from './services/metrics.js'
import { requireAuth } from './middleware/requireAuth.js'
import { ensureRole } from './middleware/rbac.js'
import { asyncRoute } from './middleware/validate.js'
import { toPublicUser } from './middleware/sanitizeResponse.js'
import { readUsers, writeUsers, updateUser } from './controllers/userStore.js'
import { run as dbRun, all as dbAll, get as dbGet, runInTransaction } from './database.js'
import { readJSON, mutateJSON } from './utils/fileStore.js'
import { sendEmail } from './emailService.js'

// ── Route modules ─────────────────────────────────────────────────────────────
import authRoutes from './routes/auth.js'
import quizRoutes from './routes/quiz.js'
import attendanceRoutes from './routes/attendance.js'
import adminRoutes from './routes/admin.js'
import notesRoutes from './routes/notes.js'

dotenv.config({ path: '.env.local' })
dotenv.config()

const app = express()

// ── CORS (lockdown to known origins) ─────────────────────────────────────────
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://localhost:5174,http://localhost:5175').split(',')
app.use(cors({ origin: allowedOrigins, credentials: true }))
// 1mb global limit — routes that accept large payloads (notes upload) apply their own higher limit
app.use(express.json({ limit: '1mb' }))

// ── Prometheus request instrumentation ───────────────────────────────────────
app.use(metricsMiddleware)

// ── General rate limit ────────────────────────────────────────────────────────
app.use('/api/', generalRateLimit)

// ── Session + Passport (Google OAuth) ────────────────────────────────────────
const SESSION_SECRET = process.env.SESSION_SECRET
const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is not set. Refusing to start.')
  process.exit(1)
}
if (!SESSION_SECRET) {
  console.error('FATAL: SESSION_SECRET environment variable is not set. Refusing to start.')
  process.exit(1)
}
app.use(session({ secret: SESSION_SECRET, resave: false, saveUninitialized: false }))
app.use(passport.initialize())
app.use(passport.session())

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET

if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy(
    { clientID: GOOGLE_CLIENT_ID, clientSecret: GOOGLE_CLIENT_SECRET, callbackURL: '/auth/google/callback' },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const users = await readUsers()
        let user = users.find(u => u.googleId === profile.id || (u.email && profile.emails?.[0]?.value === u.email))
        if (!user) {
          user = {
            id: `u-${Date.now()}`, googleId: profile.id,
            name: profile.displayName, email: profile.emails?.[0]?.value,
            role: 'student', faceImage: null, preferences: {}, history: []
          }
          users.push(user)
          await writeUsers(users)
        } else if (!user.googleId) {
          await updateUser(user.id, { googleId: profile.id })
        }
        return done(null, user)
      } catch (err) { return done(err) }
    }
  ))
  passport.serializeUser((user, done) => done(null, user.id))
  passport.deserializeUser((id, done) => {
    readUsers().then(users => done(null, users.find(u => u.id === id) || null)).catch(done)
  })
}

app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }))
app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  (req, res) => res.redirect(`${allowedOrigins[0]}?login_success=true`)
)
app.get('/api/auth/current_user', (req, res) => res.json(req.user ? toPublicUser(req.user) : null))
app.get('/api/auth/logout', (req, res, next) => req.logout(err => err ? next(err) : res.redirect('/')))

// ── Static storage ────────────────────────────────────────────────────────────
const storageDir = path.join(process.cwd(), 'server', 'storage')
const dataDir = path.join(process.cwd(), 'server', 'data')
if (!fs.existsSync(storageDir)) fs.mkdirSync(storageDir, { recursive: true })
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true })
app.use('/storage', express.static(storageDir))

// ── Mount route modules ───────────────────────────────────────────────────────
app.use('/api/auth', authRoutes)
app.use('/api/quiz', quizRoutes)
app.use('/api/attendance', attendanceRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/notes', notesRoutes)


const IDEMPOTENCY_KEY_MAX_LEN = 120

function getIdempotencyKey(req) {
  const key = req.get('Idempotency-Key') || req.get('X-Idempotency-Key')
  if (!key) return null
  const cleaned = String(key).trim()
  if (!cleaned || cleaned.length > IDEMPOTENCY_KEY_MAX_LEN) return null
  return cleaned
}

async function withIdempotency(req, action, handler) {
  const key = getIdempotencyKey(req)
  if (!key) return handler()

  const existing = await dbGet(
    `SELECT statusCode, responseBody FROM idempotency_keys WHERE key = ? AND userId = ? AND action = ?`,
    [key, req.user.id, action]
  ).catch(() => null)

  if (existing && Number(existing.statusCode) >= 0) {
    try {
      return JSON.parse(existing.responseBody)
    } catch {
      return { ok: true }
    }
  }

  const reserved = await dbRun(
    `INSERT OR IGNORE INTO idempotency_keys (key, userId, action, statusCode, responseBody, createdAt) VALUES (?,?,?,?,?,?)`,
    [key, req.user.id, action, -1, '{}', Date.now()]
  )

  if (reserved.changes === 0) {
    const ready = await dbGet(
      `SELECT statusCode, responseBody FROM idempotency_keys WHERE key = ? AND userId = ? AND action = ?`,
      [key, req.user.id, action]
    ).catch(() => null)

    if (ready && Number(ready.statusCode) >= 0) {
      try {
        return JSON.parse(ready.responseBody)
      } catch {
        return { ok: true }
      }
    }

    const err = new Error('Duplicate request is already in progress for this idempotency key')
    err.status = 409
    throw err
  }

  try {
    const payload = await handler()
    await dbRun(
      `UPDATE idempotency_keys SET statusCode = ?, responseBody = ?, createdAt = ? WHERE key = ? AND userId = ? AND action = ?`,
      [200, JSON.stringify(payload), Date.now(), key, req.user.id, action]
    )
    return payload
  } catch (err) {
    await dbRun(
      `DELETE FROM idempotency_keys WHERE key = ? AND userId = ? AND action = ? AND statusCode = -1`,
      [key, req.user.id, action]
    ).catch(() => { })
    throw err
  }
}

let legacyTimetableMigrated = false
let legacyTicketsMigrated = false

async function migrateLegacyTimetableIfNeeded(timetableFile) {
  if (legacyTimetableMigrated) return
  legacyTimetableMigrated = true

  const count = await dbGet('SELECT COUNT(1) AS c FROM timetable_entries').catch(() => ({ c: 0 }))
  if (Number(count?.c || 0) > 0) return

  const legacy = readJSON(timetableFile, [])
  if (!Array.isArray(legacy) || legacy.length === 0) return

  const now = Date.now()
  await runInTransaction(async ({ run }) => {
    for (const e of legacy) {
      if (!e || !e.day || !e.startTime || !e.endTime || !e.subject) continue
      await run(
        `INSERT OR IGNORE INTO timetable_entries (id, day, startTime, endTime, subject, teacherId, classId, room, createdAt, updatedAt) VALUES (?,?,?,?,?,?,?,?,?,?)`,
        [
          e.id || `tt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          String(e.day),
          String(e.startTime),
          String(e.endTime),
          String(e.subject),
          e.teacherId || null,
          e.classId || null,
          e.room || null,
          now,
          now,
        ]
      )
    }
  })
  console.log(`[timetable] Migrated ${legacy.length} legacy JSON entries to SQLite`)
}

async function migrateLegacyTicketsIfNeeded(ticketsFile) {
  if (legacyTicketsMigrated) return
  legacyTicketsMigrated = true

  const count = await dbGet('SELECT COUNT(1) AS c FROM tickets').catch(() => ({ c: 0 }))
  if (Number(count?.c || 0) > 0) return

  const legacy = readJSON(ticketsFile, [])
  if (!Array.isArray(legacy) || legacy.length === 0) return

  await runInTransaction(async ({ run }) => {
    for (const t of legacy) {
      if (!t || !t.id || !t.userId || !t.subject || !t.message) continue
      await run(
        `INSERT OR IGNORE INTO tickets (id, userId, userName, subject, message, category, status, createdAt, updatedAt, version) VALUES (?,?,?,?,?,?,?,?,?,?)`,
        [
          String(t.id),
          String(t.userId),
          t.userName || null,
          String(t.subject),
          String(t.message),
          String(t.category || 'general'),
          String(t.status || 'open'),
          Number(t.createdAt || Date.now()),
          Number(t.createdAt || Date.now()),
          1,
        ]
      )

      const replies = Array.isArray(t.replies) ? t.replies : []
      for (const r of replies) {
        if (!r || !r.userId || !r.message) continue
        await run(
          `INSERT INTO ticket_replies (ticketId, userId, userName, message, createdAt) VALUES (?,?,?,?,?)`,
          [String(t.id), String(r.userId), r.userName || null, String(r.message), Number(r.createdAt || Date.now())]
        )
      }
    }
  })

  console.log(`[tickets] Migrated ${legacy.length} legacy JSON tickets to SQLite`)
}

// ── Users (paginated; sensitive fields stripped) ──────────────────────────────
app.get('/api/users', requireAuth, asyncRoute(async (req, res) => {
  const page = Math.max(1, parseInt(String(req.query.page || '1')))
  const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || '50'))))
  const role = req.query.role ? String(req.query.role) : null
  const users = await readUsers()
  const filtered = role ? users.filter(u => u.role === role) : users
  const total = filtered.length
  const items = filtered.slice((page - 1) * limit, page * limit).map(toPublicUser)
  return res.json({ items, total, page, limit, pages: Math.ceil(total / limit) })
}))

app.post('/api/users/bulk', requireAuth, ensureRole('admin'), asyncRoute(async (req, res) => {
  const users = req.body
  if (!Array.isArray(users)) return res.status(400).json({ error: 'Expected an array of users' })
  const ok = await writeUsers(users)
  if (!ok) return res.status(500).json({ error: 'Failed to persist users' })
  return res.json({ ok: true, count: users.length })
}))

// ── User profile ──────────────────────────────────────────────────────────────
app.get('/api/users/profile', requireAuth, asyncRoute(async (req, res) => {
  const userId = String(req.query.userId || '')
  if (!userId) return res.status(400).json({ error: 'userId required' })
  // Users can only view their own profile unless admin/teacher
  if (req.user.id !== userId && !['admin', 'teacher'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Forbidden' })
  }
  const users = await readUsers()
  const user = users.find(u => u.id === userId)
  if (!user) return res.status(404).json({ error: 'User not found' })
  return res.json(toPublicUser(user))
}))

app.put('/api/users/profile', requireAuth, asyncRoute(async (req, res) => {
  const { userId, updates } = req.body || {}
  if (!userId) return res.status(400).json({ error: 'userId required' })
  if (req.user.id !== userId && req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' })
  if (!updates || typeof updates !== 'object') return res.status(400).json({ error: 'updates object required' })
  // Only allow safe fields
  const safe = {}
  if (updates.preferences) safe.preferences = updates.preferences
  if (updates.name) safe.name = String(updates.name).slice(0, 100)
  const updated = await updateUser(userId, safe)
  if (!updated) return res.status(404).json({ error: 'User not found' })
  return res.json({ ok: true, user: toPublicUser(updated) })
}))

// ── Classes ───────────────────────────────────────────────────────────────────
const classesFile = path.join(dataDir, 'classes.json')

app.get('/api/classes', asyncRoute(async (req, res) => {
  if (!fs.existsSync(classesFile)) return res.json([])
  return res.json(JSON.parse(fs.readFileSync(classesFile, 'utf8') || '[]'))
}))

app.post('/api/classes', requireAuth, ensureRole('admin', 'teacher'), asyncRoute(async (req, res) => {
  const classes = req.body
  if (!Array.isArray(classes)) return res.status(400).json({ error: 'Expected an array of classes' })
  fs.writeFileSync(classesFile, JSON.stringify(classes, null, 2), 'utf8')
  return res.json({ ok: true, count: classes.length })
}))

app.post('/api/classes/assign', requireAuth, ensureRole('admin', 'teacher'), asyncRoute(async (req, res) => {
  const { studentId, classId } = req.body || {}
  if (!studentId) return res.status(400).json({ error: 'studentId required' })
  const updated = await updateUser(studentId, { classId: classId || null })
  if (!updated) return res.status(404).json({ error: 'Student not found' })
  return res.json({ ok: true })
}))

// ── Question Bank ─────────────────────────────────────────────────────────────
const questionBankFile = path.join(dataDir, 'questionBank.json')

app.get('/api/question-bank', requireAuth, asyncRoute(async (req, res) => {
  if (!fs.existsSync(questionBankFile)) return res.json([])
  return res.json(JSON.parse(fs.readFileSync(questionBankFile, 'utf8') || '[]'))
}))

app.post('/api/question-bank/add', requireAuth, ensureRole('teacher', 'admin'), asyncRoute(async (req, res) => {
  const { questions } = req.body || {}
  if (!Array.isArray(questions)) return res.status(400).json({ error: 'questions must be an array' })
  const existing = fs.existsSync(questionBankFile) ? JSON.parse(fs.readFileSync(questionBankFile, 'utf8') || '[]') : []
  const tagged = questions.map(q => ({
    id: q.id || `qb-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    question: String(q.question || '').slice(0, 2000),
    options: Array.isArray(q.options) ? q.options.map(o => String(o).slice(0, 500)) : [],
    correctAnswer: String(q.correctAnswer || '').slice(0, 500),
    tags: Array.isArray(q.tags) ? q.tags : [],
    difficulty: q.difficulty || 'medium',
    subject: q.subject || 'general'
  }))
  fs.writeFileSync(questionBankFile, JSON.stringify(existing.concat(tagged), null, 2))
  return res.json({ ok: true, count: existing.length + tagged.length })
}))

app.post('/api/question-bank/upsert-quiz', requireAuth, ensureRole('teacher', 'admin'), asyncRoute(async (req, res) => {
  const { quiz, subject } = req.body || {}
  if (!Array.isArray(quiz)) return res.status(400).json({ error: 'quiz must be an array' })
  const existing = fs.existsSync(questionBankFile) ? JSON.parse(fs.readFileSync(questionBankFile, 'utf8') || '[]') : []
  const toAdd = quiz.map(q => ({
    id: q.id || `qb-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    question: String(q.question || ''), options: Array.isArray(q.options) ? q.options : [],
    correctAnswer: String(q.correctAnswer || ''), tags: Array.isArray(q.tags) ? q.tags : ['generated'],
    difficulty: q.difficulty || 'medium', subject: subject || q.subject || 'general'
  }))
  fs.writeFileSync(questionBankFile, JSON.stringify(existing.concat(toAdd), null, 2))
  return res.json({ ok: true, count: existing.length + toAdd.length })
}))

app.post('/api/question-bank/update', requireAuth, ensureRole('teacher', 'admin'), asyncRoute(async (req, res) => {
  const { id, patch } = req.body || {}
  if (!id || !patch) return res.status(400).json({ error: 'id and patch required' })
  const existing = fs.existsSync(questionBankFile) ? JSON.parse(fs.readFileSync(questionBankFile, 'utf8') || '[]') : []
  const idx = existing.findIndex(q => q.id === id)
  if (idx === -1) return res.status(404).json({ error: 'question not found' })
  existing[idx] = { ...existing[idx], ...patch }
  fs.writeFileSync(questionBankFile, JSON.stringify(existing, null, 2))
  return res.json({ ok: true })
}))

app.delete('/api/question-bank/:id', requireAuth, ensureRole('teacher', 'admin'), asyncRoute(async (req, res) => {
  const { id } = req.params
  const existing = fs.existsSync(questionBankFile) ? JSON.parse(fs.readFileSync(questionBankFile, 'utf8') || '[]') : []
  fs.writeFileSync(questionBankFile, JSON.stringify(existing.filter(q => q.id !== id), null, 2))
  return res.json({ ok: true })
}))

// ── Grades (SQLite — replaces grades.json for safe concurrent writes) ─────────
// Each INSERT/DELETE is atomic; no read-modify-write race condition possible.

app.get('/api/grades', requireAuth, asyncRoute(async (req, res) => {
  const studentId = req.query.studentId ? String(req.query.studentId) : null
  const subject = req.query.subject ? String(req.query.subject) : null
  let sql = `SELECT * FROM grades`
  const params = []
  const where = []
  if (studentId) { where.push(`studentId = ?`); params.push(studentId) }
  if (subject) { where.push(`subject = ?`); params.push(subject) }
  if (where.length) sql += ` WHERE ${where.join(' AND ')}`
  sql += ` ORDER BY createdAt DESC`
  const rows = await dbAll(sql, params).catch(() => [])
  return res.json(rows)
}))

app.post('/api/grades', requireAuth, ensureRole('teacher', 'admin'), asyncRoute(async (req, res) => {
  const { studentId, subject, category, title, score, maxScore, weight, date, teacherId } = req.body || {}
  if (!studentId || !subject || !category || !title || score === undefined || !maxScore)
    return res.status(400).json({ error: 'studentId, subject, category, title, score, maxScore required' })
  const entry = {
    id: `gr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    studentId, subject, category, title,
    score: Number(score), maxScore: Number(maxScore),
    weight: Number(weight || 1), date: date || new Date().toISOString().split('T')[0],
    teacherId: teacherId || req.user.id, createdAt: Date.now()
  }
  const payload = await withIdempotency(req, 'grades:create', async () => {
    await dbRun(
      `INSERT INTO grades (id,studentId,subject,category,title,score,maxScore,weight,date,teacherId,createdAt) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [entry.id, entry.studentId, entry.subject, entry.category, entry.title, entry.score, entry.maxScore, entry.weight, entry.date, entry.teacherId, entry.createdAt]
    )
    return { ok: true, grade: entry }
  })
  return res.json(payload)
}))

app.post('/api/grades/bulk', requireAuth, ensureRole('teacher', 'admin'), asyncRoute(async (req, res) => {
  const { grades } = req.body || {}
  if (!Array.isArray(grades)) return res.status(400).json({ error: 'grades array required' })
  const entries = grades.map(g => ({
    id: `gr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    studentId: g.studentId, subject: g.subject, category: g.category, title: g.title,
    score: Number(g.score), maxScore: Number(g.maxScore), weight: Number(g.weight || 1),
    date: g.date || new Date().toISOString().split('T')[0], teacherId: g.teacherId || req.user.id, createdAt: Date.now()
  }))
  const payload = await withIdempotency(req, 'grades:bulk', async () => {
    await runInTransaction(async ({ run }) => {
      for (const e of entries) {
        await run(
          `INSERT INTO grades (id,studentId,subject,category,title,score,maxScore,weight,date,teacherId,createdAt) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
          [e.id, e.studentId, e.subject, e.category, e.title, e.score, e.maxScore, e.weight, e.date, e.teacherId, e.createdAt]
        )
      }
    })
    return { ok: true, count: entries.length }
  })
  return res.json(payload)
}))

app.delete('/api/grades/:id', requireAuth, ensureRole('teacher', 'admin'), asyncRoute(async (req, res) => {
  const payload = await withIdempotency(req, `grades:delete:${req.params.id}`, async () => {
    await dbRun(`DELETE FROM grades WHERE id = ?`, [req.params.id])
    return { ok: true }
  })
  return res.json(payload)
}))

// -- Timetable ----------------------------------------------------------------
const timetableFile = path.join(dataDir, 'timetable.json')

app.get('/api/timetable', requireAuth, asyncRoute(async (_req, res) => {
  await migrateLegacyTimetableIfNeeded(timetableFile)
  const rows = await dbAll(`SELECT * FROM timetable_entries ORDER BY day ASC, startTime ASC, createdAt ASC`).catch(() => [])
  return res.json(rows)
}))

app.post('/api/timetable', requireAuth, ensureRole('admin', 'teacher'), asyncRoute(async (req, res) => {
  await migrateLegacyTimetableIfNeeded(timetableFile)
  const entries = req.body
  if (!Array.isArray(entries)) return res.status(400).json({ error: 'Expected array of timetable entries' })

  const payload = await withIdempotency(req, 'timetable:replace', async () => {
    const normalized = entries
      .filter(e => e && e.day && e.startTime && e.endTime && e.subject)
      .map(e => ({
        id: e.id || `tt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        day: String(e.day),
        startTime: String(e.startTime),
        endTime: String(e.endTime),
        subject: String(e.subject),
        teacherId: e.teacherId || req.user.id || null,
        classId: e.classId || null,
        room: e.room || null,
      }))

    await runInTransaction(async ({ run }) => {
      await run(`DELETE FROM timetable_entries`)
      const now = Date.now()
      for (const e of normalized) {
        await run(
          `INSERT INTO timetable_entries (id, day, startTime, endTime, subject, teacherId, classId, room, createdAt, updatedAt) VALUES (?,?,?,?,?,?,?,?,?,?)`,
          [e.id, e.day, e.startTime, e.endTime, e.subject, e.teacherId, e.classId, e.room, now, now]
        )
      }
    })

    return { ok: true, count: normalized.length }
  })

  return res.json(payload)
}))

app.post('/api/timetable/entry', requireAuth, ensureRole('admin', 'teacher'), asyncRoute(async (req, res) => {
  await migrateLegacyTimetableIfNeeded(timetableFile)
  const { day, startTime, endTime, subject, teacherId, classId, room } = req.body || {}
  if (!day || !startTime || !endTime || !subject) return res.status(400).json({ error: 'day, startTime, endTime, subject required' })

  const payload = await withIdempotency(req, 'timetable:create', async () => {
    const now = Date.now()
    const entry = {
      id: `tt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      day: String(day),
      startTime: String(startTime),
      endTime: String(endTime),
      subject: String(subject),
      teacherId: teacherId || req.user.id,
      classId: classId || null,
      room: room || null,
      createdAt: now,
      updatedAt: now,
    }

    await dbRun(
      `INSERT INTO timetable_entries (id, day, startTime, endTime, subject, teacherId, classId, room, createdAt, updatedAt) VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [entry.id, entry.day, entry.startTime, entry.endTime, entry.subject, entry.teacherId, entry.classId, entry.room, entry.createdAt, entry.updatedAt]
    )

    return { ok: true, entry }
  })

  return res.json(payload)
}))

app.delete('/api/timetable/:id', requireAuth, ensureRole('admin', 'teacher'), asyncRoute(async (req, res) => {
  await migrateLegacyTimetableIfNeeded(timetableFile)
  const payload = await withIdempotency(req, `timetable:delete:${req.params.id}`, async () => {
    const r = await dbRun(`DELETE FROM timetable_entries WHERE id = ?`, [req.params.id])
    if (!r.changes) {
      const err = new Error('Timetable entry not found')
      err.status = 404
      throw err
    }
    return { ok: true }
  })
  return res.json(payload)
}))

// -- Tags Presets -------------------------------------------------------------
const tagsPresetsFile = path.join(dataDir, 'tagsPresets.json')

app.get('/api/tags-presets', requireAuth, asyncRoute(async (req, res) => {
  return res.json(readJSON(tagsPresetsFile, {}))
}))

app.post('/api/tags-presets/update', requireAuth, ensureRole('teacher', 'admin'), asyncRoute(async (req, res) => {
  const { subject, tags } = req.body || {}
  if (!subject || !Array.isArray(tags)) return res.status(400).json({ error: 'subject and tags[] required' })
  await mutateJSON(tagsPresetsFile, {}, obj => { obj[subject] = tags; return obj })
  return res.json({ ok: true })
}))

// -- Tickets / Help Desk ------------------------------------------------------
const ticketsFile = path.join(dataDir, 'tickets.json')

app.get('/api/tickets', requireAuth, asyncRoute(async (req, res) => {
  await migrateLegacyTicketsIfNeeded(ticketsFile)

  const where = req.user.role === 'student' ? 'WHERE t.userId = ?' : ''
  const params = req.user.role === 'student' ? [req.user.id] : []

  const rows = await dbAll(
    `SELECT t.*, tr.id AS reply_id, tr.userId AS reply_userId, tr.userName AS reply_userName, tr.message AS reply_message, tr.createdAt AS reply_createdAt
     FROM tickets t
     LEFT JOIN ticket_replies tr ON tr.ticketId = t.id
     ${where}
     ORDER BY t.createdAt DESC, tr.createdAt ASC`,
    params
  ).catch(() => [])

  const byId = new Map()
  for (const row of rows) {
    if (!byId.has(row.id)) {
      byId.set(row.id, {
        id: row.id,
        userId: row.userId,
        userName: row.userName,
        subject: row.subject,
        message: row.message,
        category: row.category,
        status: row.status,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        version: row.version,
        replies: [],
      })
    }
    if (row.reply_id) {
      byId.get(row.id).replies.push({
        id: row.reply_id,
        userId: row.reply_userId,
        userName: row.reply_userName,
        message: row.reply_message,
        createdAt: row.reply_createdAt,
      })
    }
  }

  return res.json(Array.from(byId.values()))
}))

app.post('/api/tickets', requireAuth, asyncRoute(async (req, res) => {
  await migrateLegacyTicketsIfNeeded(ticketsFile)
  const { subject, message, category } = req.body || {}
  if (!subject || !message) return res.status(400).json({ error: 'subject and message required' })

  const payload = await withIdempotency(req, 'tickets:create', async () => {
    const now = Date.now()
    const ticket = {
      id: `tk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      userId: req.user.id,
      userName: req.user.name || req.user.email,
      subject: String(subject).slice(0, 200),
      message: String(message).slice(0, 5000),
      category: category || 'general',
      status: 'open',
      createdAt: now,
      updatedAt: now,
      version: 1,
      replies: [],
    }

    await dbRun(
      `INSERT INTO tickets (id, userId, userName, subject, message, category, status, createdAt, updatedAt, version) VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [ticket.id, ticket.userId, ticket.userName, ticket.subject, ticket.message, ticket.category, ticket.status, ticket.createdAt, ticket.updatedAt, ticket.version]
    )

    return { ok: true, ticket }
  })

  return res.json(payload)
}))

app.post('/api/tickets/:id/reply', requireAuth, asyncRoute(async (req, res) => {
  await migrateLegacyTicketsIfNeeded(ticketsFile)
  const { message, expectedVersion } = req.body || {}
  if (!message) return res.status(400).json({ error: 'message required' })

  const payload = await withIdempotency(req, `tickets:reply:${req.params.id}`, async () => {
    const ticketId = req.params.id
    const reply = {
      userId: req.user.id,
      userName: req.user.name || req.user.email,
      message: String(message).slice(0, 5000),
      createdAt: Date.now(),
    }

    await runInTransaction(async ({ get, run }) => {
      const ticket = await get(`SELECT id, userId, status, version FROM tickets WHERE id = ?`, [ticketId])
      if (!ticket) {
        const err = new Error('Ticket not found')
        err.status = 404
        throw err
      }
      if (req.user.role === 'student' && ticket.userId !== req.user.id) {
        const err = new Error('Forbidden')
        err.status = 403
        throw err
      }
      if (ticket.status === 'closed') {
        const err = new Error('Ticket is closed')
        err.status = 409
        throw err
      }
      if (expectedVersion !== undefined && Number(expectedVersion) !== Number(ticket.version)) {
        const err = new Error('Ticket was updated by another user. Refresh and retry.')
        err.status = 409
        throw err
      }

      await run(
        `INSERT INTO ticket_replies (ticketId, userId, userName, message, createdAt) VALUES (?,?,?,?,?)`,
        [ticketId, reply.userId, reply.userName, reply.message, reply.createdAt]
      )

      await run(`UPDATE tickets SET updatedAt = ?, version = version + 1 WHERE id = ?`, [Date.now(), ticketId])
    })

    return { ok: true }
  })

  return res.json(payload)
}))

app.post('/api/tickets/:id/close', requireAuth, ensureRole('admin', 'teacher'), asyncRoute(async (req, res) => {
  await migrateLegacyTicketsIfNeeded(ticketsFile)

  const payload = await withIdempotency(req, `tickets:close:${req.params.id}`, async () => {
    const expectedVersion = req.body?.expectedVersion

    await runInTransaction(async ({ get, run }) => {
      const ticket = await get(`SELECT id, status, version FROM tickets WHERE id = ?`, [req.params.id])
      if (!ticket) {
        const err = new Error('Ticket not found')
        err.status = 404
        throw err
      }
      if (ticket.status === 'closed') return
      if (expectedVersion !== undefined && Number(expectedVersion) !== Number(ticket.version)) {
        const err = new Error('Ticket was updated by another user. Refresh and retry.')
        err.status = 409
        throw err
      }
      await run(`UPDATE tickets SET status = 'closed', updatedAt = ?, version = version + 1 WHERE id = ?`, [Date.now(), req.params.id])
    })

    return { ok: true }
  })

  return res.json(payload)
}))



app.post('/api/email-notification', requireAuth, ensureRole('teacher', 'admin'), asyncRoute(async (req, res) => {
  const { to, subject, html } = req.body || {}
  if (!to || !subject || !html) return res.status(400).json({ error: 'to, subject, and html are required' })

  const recipients = Array.isArray(to) ? to : [to]
  const safeRecipients = recipients.map(r => String(r).trim()).filter(Boolean)
  if (safeRecipients.length === 0) return res.status(400).json({ error: 'at least one valid recipient is required' })

  const resendKey = process.env.RESEND_API_KEY

  if (resendKey) {
    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendKey}`,
      },
      body: JSON.stringify({
        from: process.env.SMTP_FROM || 'Gyandeep <noreply@gyandeep.app>',
        to: safeRecipients,
        subject: String(subject).slice(0, 200),
        html: String(html),
      }),
    })

    if (!resp.ok) {
      const body = await resp.json().catch(() => ({}))
      return res.status(502).json({ error: body?.message || 'Resend email send failed' })
    }

    const body = await resp.json().catch(() => ({}))
    return res.json({ ok: true, provider: 'resend', id: body?.id || null })
  }

  const results = []
  for (const recipient of safeRecipients) {
    const info = await sendEmail({ to: recipient, subject: String(subject).slice(0, 200), html: String(html) })
    results.push({ to: recipient, messageId: info?.messageId || null })
  }

  return res.json({ ok: true, provider: 'smtp', results })
}))

// -- AI Email Compose (Gemini-powered) -----------------------------------------
app.post('/api/ai-email', requireAuth, ensureRole('teacher', 'admin'), aiRateLimit, asyncRoute(async (req, res) => {
  const { prompt, recipients, context } = req.body || {}
  if (!prompt || !recipients) return res.status(400).json({ error: 'prompt and recipients required' })

  const llm = getLLMService()
  const aiPrompt = `You are an email assistant for a school called Gyandeep. Write a professional email based on this request:
"${String(prompt).slice(0, 500)}"
${context ? `Context: ${String(context).slice(0, 500)}` : ''}
Return ONLY a JSON object with "subject" and "html" fields. The html should be well-formatted with inline styles.`

  const raw = await llm.generate(aiPrompt)
  let parsed
  try {
    const match = raw.match(/\{[\s\S]*\}/)
    parsed = JSON.parse(match ? match[0] : raw)
  } catch {
    return res.status(500).json({ error: 'AI failed to generate valid email' })
  }

  const safeRecipients = (Array.isArray(recipients) ? recipients : [recipients]).map(r => String(r).trim()).filter(Boolean)

  for (const to of safeRecipients) {
    await sendEmail({ to, subject: parsed.subject, html: parsed.html })
  }

  return res.json({ ok: true, subject: parsed.subject, sentTo: safeRecipients.length })
}))

// -- Notifications -------------------------------------------------------------
const notificationsFile = path.join(dataDir, 'notifications.json')

app.get('/api/notifications', requireAuth, asyncRoute(async (req, res) => {
  const all = readJSON(notificationsFile, [])
  return res.json(all.filter(n => n.userId === req.user.id || n.userId === 'all'))
}))

app.post('/api/notifications', requireAuth, ensureRole('admin', 'teacher'), asyncRoute(async (req, res) => {
  const { userId, title, message, type } = req.body || {}
  if (!title || !message) return res.status(400).json({ error: 'title and message required' })
  const payload = await withIdempotency(req, 'notifications:create', async () => {
    const notif = {
      id: `n-${Date.now()}`, userId: userId || 'all',
      title: String(title).slice(0, 200), message: String(message).slice(0, 2000),
      type: type || 'info', read: false, createdAt: Date.now()
    }
    await mutateJSON(notificationsFile, [], arr => { arr.push(notif); return arr })
    return { ok: true, notification: notif }
  })
  return res.json(payload)
}))

// PATCH: Mark a notification as read
app.patch('/api/notifications/:id/read', requireAuth, asyncRoute(async (req, res) => {
  const { id } = req.params
  let found = false
  await mutateJSON(notificationsFile, [], arr => arr.map(n => {
    if (n.id === id && (n.userId === req.user.id || n.userId === 'all' || ['admin', 'teacher'].includes(req.user.role))) {
      found = true
      return { ...n, read: true }
    }
    return n
  }))
  if (!found) return res.status(404).json({ error: 'Notification not found' })
  return res.json({ ok: true })
}))

// DELETE: Dismiss / remove a notification
app.delete('/api/notifications/:id', requireAuth, asyncRoute(async (req, res) => {
  const { id } = req.params
  let removed = false
  await mutateJSON(notificationsFile, [], arr => {
    const next = arr.filter(n => {
      if (n.id !== id) return true
      if (n.userId === req.user.id || n.userId === 'all' || ['admin', 'teacher'].includes(req.user.role)) {
        removed = true
        return false
      }
      return true
    })
    return next
  })
  if (!removed) return res.status(404).json({ error: 'Notification not found or forbidden' })
  return res.json({ ok: true })
}))

// ── Webhooks ──────────────────────────────────────────────────────────────────
const webhooksFile = path.join(dataDir, 'webhooks.json')

app.get('/api/webhooks', requireAuth, ensureRole('admin'), asyncRoute(async (req, res) => {
  return res.json(readJSON(webhooksFile, []))
}))

app.post('/api/webhooks', requireAuth, ensureRole('admin'), asyncRoute(async (req, res) => {
  const { url, events, name } = req.body || {}
  if (!url || !events) return res.status(400).json({ error: 'url and events required' })
  const hook = { id: `wh-${Date.now()}`, url, events: Array.isArray(events) ? events : [events], name: name || url, active: true, createdAt: Date.now() }
  await mutateJSON(webhooksFile, [], arr => { arr.push(hook); return arr })
  return res.json({ ok: true, webhook: hook })
}))

app.delete('/api/webhooks/:id', requireAuth, ensureRole('admin'), asyncRoute(async (req, res) => {
  await mutateJSON(webhooksFile, [], arr => arr.filter(w => w.id !== req.params.id))
  return res.json({ ok: true })
}))

// ── AI Chat ───────────────────────────────────────────────────────────────────
app.post('/api/chat', aiRateLimit, requireAuth, asyncRoute(async (req, res) => {
  const llm = getLLMService()
  if (!llm) return res.status(503).json({ error: 'AI unavailable. Set GEMINI_API_KEY.' })
  const { prompt, location, model, classId, subjectId } = req.body || {}
  if (!prompt) return res.status(400).json({ error: 'prompt is required' })
  let ragContext = ''
  try { ragContext = await buildContext(prompt, { classId, subjectId, topK: 3 }) } catch { }
  const result = await llm.chat(String(prompt), ragContext, { fast: model === 'fast', location })
  return res.json({ ...result, ragUsed: !!ragContext })
}))

// ── Summarize (legacy path kept for compatibility) ────────────────────────────
app.post('/api/summarize', aiRateLimit, requireAuth, asyncRoute(async (req, res) => {
  const llm = getLLMService()
  if (!llm) return res.status(503).json({ error: 'AI unavailable.' })
  const { text, mode, subject } = req.body || {}
  if (!text) return res.status(400).json({ error: 'text is required' })
  return res.json(await llm.summarize(String(text), mode || 'bullets', subject || ''))
}))

// ── Auto-grade (legacy path) ──────────────────────────────────────────────────
app.post('/api/auto-grade', aiRateLimit, requireAuth, ensureRole('teacher', 'admin'), asyncRoute(async (req, res) => {
  const llm = getLLMService()
  if (!llm) return res.status(503).json({ error: 'AI unavailable.' })
  const { question, studentAnswer, answer, rubric, subject, maxScore = 10 } = req.body || {}
  const ans = studentAnswer || answer
  if (!question || !ans) return res.status(400).json({ error: 'question and studentAnswer are required' })
  return res.json(await llm.autoGrade(String(question), String(ans), rubric, Number(maxScore), subject || ''))
}))

// ── Analytics insights (legacy path) ─────────────────────────────────────────
app.post('/api/analytics/insights', aiRateLimit, requireAuth, ensureRole('teacher', 'admin'), asyncRoute(async (req, res) => {
  const llm = getLLMService()
  if (!llm) return res.status(503).json({ error: 'AI unavailable.' })
  const { studentData, type } = req.body || {}
  if (!studentData) return res.status(400).json({ error: 'studentData required' })
  return res.json(await llm.analyticsInsights(studentData, type || 'general'))
}))

// ── Teacher insights (generated by weekly cron) ───────────────────────────────
app.get('/api/teacher/insights', requireAuth, ensureRole('teacher', 'admin'), asyncRoute(async (req, res) => {
  const rows = await dbAll(
    `SELECT insight_text, generated_at FROM teacher_insights WHERE teacher_id = ? ORDER BY generated_at DESC LIMIT 10`,
    [req.user.id]
  ).catch(() => [])
  return res.json({ insights: rows })
}))

// ── Integration stubs ─────────────────────────────────────────────────────────
app.post('/api/integrations/calendar/sync', requireAuth, asyncRoute(async (req, res) => {
  const { title, start, end } = req.body || {}
  if (!title || !start || !end) return res.status(400).json({ error: 'title,start,end required' })
  return res.json({ ok: true })
}))

app.post('/api/integrations/drive/upload', requireAuth, asyncRoute(async (req, res) => {
  const { name, url } = req.body || {}
  if (!name || !url) return res.status(400).json({ error: 'name,url required' })
  return res.json({ ok: true })
}))

// ── Job queue API ─────────────────────────────────────────────────────────────
app.post('/api/jobs', requireAuth, asyncRoute(async (req, res) => {
  const { queueName, data, opts } = req.body || {}
  if (!queueName || !data) return res.status(400).json({ error: 'queueName and data required' })
  const job = await addJob(queueName, data, opts || {})
  return res.json({ ok: true, job, mode: isRedisMode() ? 'bullmq' : 'in-process' })
}))

app.get('/api/jobs/:queueName/:id', requireAuth, asyncRoute(async (req, res) => {
  const job = await getJob(req.params.queueName, req.params.id)
  if (!job) return res.status(404).json({ error: 'Job not found' })
  return res.json(job)
}))

// ── Embeddings / RAG ──────────────────────────────────────────────────────────
app.post('/api/embeddings/index', requireAuth, ensureRole('teacher', 'admin'), asyncRoute(async (req, res) => {
  const { classId, subjectId, title, text, id } = req.body || {}
  if (!text || !title) return res.status(400).json({ error: 'title and text required' })
  const result = await indexContent({ id: id || `doc-${Date.now()}`, classId: classId || 'default', subjectId: subjectId || 'default', title, text })
  return res.json({ ok: true, ...result })
}))

app.get('/api/embeddings/search', requireAuth, asyncRoute(async (req, res) => {
  const query = String(req.query.q || '')
  if (!query) return res.status(400).json({ error: 'q param required' })
  const results = await semanticSearch(query, { classId: req.query.classId, subjectId: req.query.subjectId, topK: parseInt(String(req.query.topK || '5')) })
  return res.json({ results })
}))

app.get('/api/embeddings/stats', requireAuth, asyncRoute(async (req, res) => res.json(indexStats())))

// ── Register background job processors ───────────────────────────────────────
registerProcessor('quiz-generation', async (data) => {
  const { notesText, subject, notesHash } = data
  const llm = getLLMService()
  if (!llm) throw new Error('AI unavailable')
  const quiz = await llm.generateQuiz(notesText, subject)
  // Cache for future requests
  if (notesHash) {
    const { cacheQuiz } = await import('./services/redisService.js')
    await cacheQuiz(notesHash, subject, quiz)
  }
  return quiz
})

registerProcessor('auto-grade', async (data) => {
  const { question, studentAnswer, rubric, subject, maxScore = 10 } = data
  const llm = getLLMService()
  if (!llm) throw new Error('AI unavailable')
  return llm.autoGrade(question, studentAnswer, rubric, maxScore, subject)
})

registerProcessor('embedding-index', async (data) => indexContent(data))

// ── Register cron jobs ────────────────────────────────────────────────────────
registerWeeklyInsightsCron()

  // Audit log archival — runs daily at 2:00 AM.
  // Archives rows older than 90 days to a NDJSON file and deletes them from SQLite
  // to prevent the table growing to hundreds of millions of rows.
  ; (async () => {
    try {
      const { default: nodeCron } = await import('node-cron')
      nodeCron.schedule('0 2 * * *', async () => {
        const cutoff = Date.now() - 90 * 24 * 60 * 60 * 1000   // 90 days ago
        try {
          const rows = await dbAll(`SELECT * FROM audit_logs WHERE ts < ? ORDER BY ts ASC`, [cutoff])
          if (rows && rows.length > 0) {
            const archiveFile = path.join(dataDir, `audit_archive_${new Date().toISOString().slice(0, 10)}.ndjson`)
            const lines = rows.map(r => JSON.stringify(r)).join('\n') + '\n'
            fs.appendFileSync(archiveFile, lines, 'utf8')
            await dbRun(`DELETE FROM audit_logs WHERE ts < ?`, [cutoff])
            console.log(`✓ Audit log: archived ${rows.length} records older than 90 days → ${archiveFile}`)
          }
        } catch (err) {
          console.error('Audit log archival error:', err.message)
        }
      })
    } catch { /* node-cron not available */ }
  })()

// ── Register attendance flush function ────────────────────────────────────────
registerAttendanceFlusher(async (records) => {
  if (records.length === 0) return
  // Wrap all inserts in a single transaction: 750 individual INSERTs with
  // separate write locks takes 2-3s; one transaction takes ~50ms.
  try {
    await dbRun('BEGIN')
    for (const r of records) {
      await dbRun(
        `INSERT OR IGNORE INTO attendance (session_id, student_id, status, verified_at) VALUES (?,?,?,?)`,
        [r.sessionId, r.studentId, r.status || 'present', r.verifiedAt || new Date().toISOString()]
      )
    }
    await dbRun('COMMIT')
  } catch (err) {
    console.error('Attendance flush transaction error:', err.message)
    try { await dbRun('ROLLBACK') } catch { }
    // Re-throw so redisService re-queues the records
    throw err
  }
})

// ── Prometheus metrics scrape endpoint ───────────────────────────────────────
// Restricted to internal/monitoring networks in production via a reverse proxy.
// The endpoint itself does not require auth so Prometheus can scrape it without
// needing to manage JWT tokens — ensure it is not publicly reachable in prod.
app.get('/metrics', asyncRoute(async (req, res) => {
  // Update attendance buffer gauges on each scrape so values are fresh
  const { attendanceBufferStats } = await import('./services/redisService.js')
  const bufStats = await attendanceBufferStats()
  attendanceQueueDepth.set(bufStats.queueDepth)
  if (bufStats.flushLagMs !== null) attendanceFlushLagMs.set(bufStats.flushLagMs)

  res.set('Content-Type', register.contentType)
  res.end(await register.metrics())
}))

// ── Health check ──────────────────────────────────────────────────────────────


app.get('/api/admin/email/health', requireAuth, ensureRole('admin'), asyncRoute(async (_req, res) => {
  const smtpConfigured = !!(process.env.SMTP_USER && process.env.SMTP_PASS)
  const resendConfigured = !!process.env.RESEND_API_KEY

  const transport = smtpConfigured ? 'smtp' : (resendConfigured ? 'resend-only' : 'none')
  const message = smtpConfigured
    ? 'SMTP configured for OTP/password emails'
    : (resendConfigured ? 'Only Resend configured for notification emails' : 'No email transport configured')

  return res.json({
    ok: true,
    smtpConfigured,
    resendConfigured,
    transport,
    message,
  })
}))

app.get('/health', asyncRoute(async (req, res) => {
  const { redisOk, attendanceBufferStats } = await import('./services/redisService.js')
  const bufStats = await attendanceBufferStats()
  const status = {
    db: 'unknown',
    redis: redisOk ? 'ok' : 'unavailable (in-process fallback)',
    jobMode: isRedisMode() ? 'bullmq' : 'in-process',
    uptime: Math.floor(process.uptime()),
    attendance: {
      queueDepth: bufStats.queueDepth,
      flushLagMs: bufStats.flushLagMs,
      lastFlushError: bufStats.lastFlushError || null,
    },
  }
  try { await dbAll('SELECT 1'); status.db = 'ok' } catch { status.db = 'error' }

  // Warn if flush has not happened in the last 30 seconds (write bottleneck indicator)
  const flushLagging = bufStats.flushLagMs !== null && bufStats.flushLagMs > 30_000
  const healthy = status.db === 'ok' && !flushLagging
  return res.status(healthy ? 200 : 503).json({ status: healthy ? 'ok' : 'degraded', checks: status })
}))

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err, req, res, _next) => {
  console.error('Unhandled server error:', err)
  const status = err.status || 500
  const message = err instanceof Error ? err.message : 'Internal server error'
  res.status(status).json({ error: message })
})

process.on('uncaughtException', err => console.error('Uncaught Exception:', err))
process.on('unhandledRejection', reason => console.error('Unhandled Rejection:', reason))
process.on('SIGTERM', async () => {
  console.log('SIGTERM received — flushing attendance buffer...')
  await flushAttendanceNow()
  process.exit(0)
})

// ── Start server ──────────────────────────────────────────────────────────────
const port = process.env.PORT ? Number(process.env.PORT) : 3001

initDB()
  .then(() => setupSchema())
  .catch(err => console.warn('DB init failed (continuing without DB):', err?.message || err))
  .finally(() => {
    app.listen(port, () => {
      console.log(`🚀 Gyandeep API running on http://localhost:${port}`)
      console.log(`   AI service: ${getLLMService() ? 'enabled' : 'disabled (set GEMINI_API_KEY)'}`)
      console.log(`   Job queue:  ${isRedisMode() ? 'BullMQ (Redis)' : 'in-process fallback'}`)
    })
  })
