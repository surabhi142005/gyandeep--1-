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
import { requireAuth } from './middleware/requireAuth.js'
import { ensureRole } from './middleware/rbac.js'
import { asyncRoute } from './middleware/validate.js'
import { toPublicUser } from './middleware/sanitizeResponse.js'
import { readUsers, writeUsers, updateUser } from './controllers/userStore.js'
import { run as dbRun, all as dbAll } from './database.js'

// ── Route modules ─────────────────────────────────────────────────────────────
import authRoutes       from './routes/auth.js'
import quizRoutes       from './routes/quiz.js'
import attendanceRoutes from './routes/attendance.js'
import adminRoutes      from './routes/admin.js'
import notesRoutes      from './routes/notes.js'

dotenv.config({ path: '.env.local' })
dotenv.config()

const app = express()

// ── CORS (lockdown to known origins) ─────────────────────────────────────────
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://localhost:5174,http://localhost:5175').split(',')
app.use(cors({ origin: allowedOrigins, credentials: true }))
app.use(express.json({ limit: '10mb' }))

// ── General rate limit ────────────────────────────────────────────────────────
app.use('/api/', generalRateLimit)

// ── Session + Passport (Google OAuth) ────────────────────────────────────────
const SESSION_SECRET = process.env.SESSION_SECRET || 'gyandeep-secret-key'
const JWT_SECRET     = process.env.JWT_SECRET || SESSION_SECRET
app.use(session({ secret: SESSION_SECRET, resave: false, saveUninitialized: false }))
app.use(passport.initialize())
app.use(passport.session())

const GOOGLE_CLIENT_ID     = process.env.GOOGLE_CLIENT_ID
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
const dataDir    = path.join(process.cwd(), 'server', 'data')
if (!fs.existsSync(storageDir)) fs.mkdirSync(storageDir, { recursive: true })
if (!fs.existsSync(dataDir))    fs.mkdirSync(dataDir,    { recursive: true })
app.use('/storage', express.static(storageDir))

// ── Mount route modules ───────────────────────────────────────────────────────
app.use('/api/auth',       authRoutes)
app.use('/api/quiz',       quizRoutes)
app.use('/api/attendance', attendanceRoutes)
app.use('/api/admin',      adminRoutes)
app.use('/api/notes',      notesRoutes)

// ── Users (public list for admin/teacher use, sensitive fields stripped) ──────
app.get('/api/users', requireAuth, asyncRoute(async (req, res) => {
  const users = await readUsers()
  return res.json(users.map(toPublicUser))
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
  if (updates.name)        safe.name = String(updates.name).slice(0, 100)
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

// ── Grades ────────────────────────────────────────────────────────────────────
const gradesFile = path.join(dataDir, 'grades.json')

app.get('/api/grades', requireAuth, asyncRoute(async (req, res) => {
  if (!fs.existsSync(gradesFile)) return res.json([])
  return res.json(JSON.parse(fs.readFileSync(gradesFile, 'utf8') || '[]'))
}))

app.post('/api/grades', requireAuth, ensureRole('teacher', 'admin'), asyncRoute(async (req, res) => {
  const { studentId, subject, category, title, score, maxScore, weight, date, teacherId } = req.body || {}
  if (!studentId || !subject || !category || !title || score === undefined || !maxScore)
    return res.status(400).json({ error: 'studentId, subject, category, title, score, maxScore required' })
  const existing = fs.existsSync(gradesFile) ? JSON.parse(fs.readFileSync(gradesFile, 'utf8') || '[]') : []
  const entry = {
    id: `gr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    studentId, subject, category, title,
    score: Number(score), maxScore: Number(maxScore),
    weight: Number(weight || 1), date: date || new Date().toISOString().split('T')[0],
    teacherId: teacherId || req.user.id, createdAt: Date.now()
  }
  existing.push(entry)
  fs.writeFileSync(gradesFile, JSON.stringify(existing, null, 2))
  return res.json({ ok: true, grade: entry })
}))

app.post('/api/grades/bulk', requireAuth, ensureRole('teacher', 'admin'), asyncRoute(async (req, res) => {
  const { grades } = req.body || {}
  if (!Array.isArray(grades)) return res.status(400).json({ error: 'grades array required' })
  const existing = fs.existsSync(gradesFile) ? JSON.parse(fs.readFileSync(gradesFile, 'utf8') || '[]') : []
  const entries = grades.map(g => ({
    id: `gr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    studentId: g.studentId, subject: g.subject, category: g.category, title: g.title,
    score: Number(g.score), maxScore: Number(g.maxScore), weight: Number(g.weight || 1),
    date: g.date || new Date().toISOString().split('T')[0], teacherId: g.teacherId || req.user.id, createdAt: Date.now()
  }))
  fs.writeFileSync(gradesFile, JSON.stringify(existing.concat(entries), null, 2))
  return res.json({ ok: true, count: entries.length })
}))

app.delete('/api/grades/:id', requireAuth, ensureRole('teacher', 'admin'), asyncRoute(async (req, res) => {
  const existing = fs.existsSync(gradesFile) ? JSON.parse(fs.readFileSync(gradesFile, 'utf8') || '[]') : []
  fs.writeFileSync(gradesFile, JSON.stringify(existing.filter(g => g.id !== req.params.id), null, 2))
  return res.json({ ok: true })
}))

// ── Timetable ─────────────────────────────────────────────────────────────────
const timetableFile = path.join(dataDir, 'timetable.json')

app.get('/api/timetable', requireAuth, asyncRoute(async (req, res) => {
  if (!fs.existsSync(timetableFile)) return res.json([])
  return res.json(JSON.parse(fs.readFileSync(timetableFile, 'utf8') || '[]'))
}))

app.post('/api/timetable', requireAuth, ensureRole('admin', 'teacher'), asyncRoute(async (req, res) => {
  const entries = req.body
  if (!Array.isArray(entries)) return res.status(400).json({ error: 'Expected array of timetable entries' })
  fs.writeFileSync(timetableFile, JSON.stringify(entries, null, 2))
  return res.json({ ok: true, count: entries.length })
}))

app.post('/api/timetable/entry', requireAuth, ensureRole('admin', 'teacher'), asyncRoute(async (req, res) => {
  const { day, startTime, endTime, subject, teacherId, classId, room } = req.body || {}
  if (!day || !startTime || !endTime || !subject) return res.status(400).json({ error: 'day, startTime, endTime, subject required' })
  const existing = fs.existsSync(timetableFile) ? JSON.parse(fs.readFileSync(timetableFile, 'utf8') || '[]') : []
  const entry = {
    id: `tt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    day, startTime, endTime, subject,
    teacherId: teacherId || req.user.id, classId: classId || null, room: room || null
  }
  existing.push(entry)
  fs.writeFileSync(timetableFile, JSON.stringify(existing, null, 2))
  return res.json({ ok: true, entry })
}))

app.delete('/api/timetable/:id', requireAuth, ensureRole('admin', 'teacher'), asyncRoute(async (req, res) => {
  const existing = fs.existsSync(timetableFile) ? JSON.parse(fs.readFileSync(timetableFile, 'utf8') || '[]') : []
  fs.writeFileSync(timetableFile, JSON.stringify(existing.filter(e => e.id !== req.params.id), null, 2))
  return res.json({ ok: true })
}))

// ── Tags Presets ──────────────────────────────────────────────────────────────
const tagsPresetsFile = path.join(dataDir, 'tagsPresets.json')

app.get('/api/tags-presets', requireAuth, asyncRoute(async (req, res) => {
  if (!fs.existsSync(tagsPresetsFile)) return res.json({})
  return res.json(JSON.parse(fs.readFileSync(tagsPresetsFile, 'utf8') || '{}'))
}))

app.post('/api/tags-presets/update', requireAuth, ensureRole('teacher', 'admin'), asyncRoute(async (req, res) => {
  const { subject, tags } = req.body || {}
  if (!subject || !Array.isArray(tags)) return res.status(400).json({ error: 'subject and tags[] required' })
  const existing = fs.existsSync(tagsPresetsFile) ? JSON.parse(fs.readFileSync(tagsPresetsFile, 'utf8') || '{}') : {}
  existing[subject] = tags
  fs.writeFileSync(tagsPresetsFile, JSON.stringify(existing, null, 2))
  return res.json({ ok: true })
}))

// ── Tickets / Help Desk ───────────────────────────────────────────────────────
const ticketsFile = path.join(dataDir, 'tickets.json')

app.get('/api/tickets', requireAuth, asyncRoute(async (req, res) => {
  if (!fs.existsSync(ticketsFile)) return res.json([])
  const tickets = JSON.parse(fs.readFileSync(ticketsFile, 'utf8') || '[]')
  // Students see only their own tickets
  if (req.user.role === 'student') return res.json(tickets.filter(t => t.userId === req.user.id))
  return res.json(tickets)
}))

app.post('/api/tickets', requireAuth, asyncRoute(async (req, res) => {
  const { subject, message, category } = req.body || {}
  if (!subject || !message) return res.status(400).json({ error: 'subject and message required' })
  const existing = fs.existsSync(ticketsFile) ? JSON.parse(fs.readFileSync(ticketsFile, 'utf8') || '[]') : []
  const ticket = {
    id: `tk-${Date.now()}`, userId: req.user.id, userName: req.user.name || req.user.email,
    subject: String(subject).slice(0, 200), message: String(message).slice(0, 5000),
    category: category || 'general', status: 'open', createdAt: Date.now(), replies: []
  }
  existing.push(ticket)
  fs.writeFileSync(ticketsFile, JSON.stringify(existing, null, 2))
  return res.json({ ok: true, ticket })
}))

app.post('/api/tickets/:id/reply', requireAuth, asyncRoute(async (req, res) => {
  const { message } = req.body || {}
  if (!message) return res.status(400).json({ error: 'message required' })
  const existing = fs.existsSync(ticketsFile) ? JSON.parse(fs.readFileSync(ticketsFile, 'utf8') || '[]') : []
  const idx = existing.findIndex(t => t.id === req.params.id)
  if (idx === -1) return res.status(404).json({ error: 'Ticket not found' })
  // Students can only reply to their own tickets
  if (req.user.role === 'student' && existing[idx].userId !== req.user.id)
    return res.status(403).json({ error: 'Forbidden' })
  existing[idx].replies.push({ userId: req.user.id, userName: req.user.name || req.user.email, message: String(message).slice(0, 5000), createdAt: Date.now() })
  fs.writeFileSync(ticketsFile, JSON.stringify(existing, null, 2))
  return res.json({ ok: true })
}))

app.post('/api/tickets/:id/close', requireAuth, ensureRole('admin', 'teacher'), asyncRoute(async (req, res) => {
  const existing = fs.existsSync(ticketsFile) ? JSON.parse(fs.readFileSync(ticketsFile, 'utf8') || '[]') : []
  const idx = existing.findIndex(t => t.id === req.params.id)
  if (idx === -1) return res.status(404).json({ error: 'Ticket not found' })
  existing[idx].status = 'closed'
  fs.writeFileSync(ticketsFile, JSON.stringify(existing, null, 2))
  return res.json({ ok: true })
}))

// ── Notifications ─────────────────────────────────────────────────────────────
const notificationsFile = path.join(dataDir, 'notifications.json')

app.get('/api/notifications', requireAuth, asyncRoute(async (req, res) => {
  if (!fs.existsSync(notificationsFile)) return res.json([])
  const all = JSON.parse(fs.readFileSync(notificationsFile, 'utf8') || '[]')
  return res.json(all.filter(n => n.userId === req.user.id || n.userId === 'all'))
}))

app.post('/api/notifications', requireAuth, ensureRole('admin', 'teacher'), asyncRoute(async (req, res) => {
  const { userId, title, message, type } = req.body || {}
  if (!title || !message) return res.status(400).json({ error: 'title and message required' })
  const existing = fs.existsSync(notificationsFile) ? JSON.parse(fs.readFileSync(notificationsFile, 'utf8') || '[]') : []
  const notif = { id: `n-${Date.now()}`, userId: userId || 'all', title: String(title).slice(0, 200), message: String(message).slice(0, 2000), type: type || 'info', read: false, createdAt: Date.now() }
  existing.push(notif)
  fs.writeFileSync(notificationsFile, JSON.stringify(existing, null, 2))
  return res.json({ ok: true, notification: notif })
}))

// ── Webhooks ──────────────────────────────────────────────────────────────────
const webhooksFile = path.join(dataDir, 'webhooks.json')

app.get('/api/webhooks', requireAuth, ensureRole('admin'), asyncRoute(async (req, res) => {
  if (!fs.existsSync(webhooksFile)) return res.json([])
  return res.json(JSON.parse(fs.readFileSync(webhooksFile, 'utf8') || '[]'))
}))

app.post('/api/webhooks', requireAuth, ensureRole('admin'), asyncRoute(async (req, res) => {
  const { url, events, name } = req.body || {}
  if (!url || !events) return res.status(400).json({ error: 'url and events required' })
  const existing = fs.existsSync(webhooksFile) ? JSON.parse(fs.readFileSync(webhooksFile, 'utf8') || '[]') : []
  const hook = { id: `wh-${Date.now()}`, url, events: Array.isArray(events) ? events : [events], name: name || url, active: true, createdAt: Date.now() }
  existing.push(hook)
  fs.writeFileSync(webhooksFile, JSON.stringify(existing, null, 2))
  return res.json({ ok: true, webhook: hook })
}))

app.delete('/api/webhooks/:id', requireAuth, ensureRole('admin'), asyncRoute(async (req, res) => {
  const existing = fs.existsSync(webhooksFile) ? JSON.parse(fs.readFileSync(webhooksFile, 'utf8') || '[]') : []
  fs.writeFileSync(webhooksFile, JSON.stringify(existing.filter(w => w.id !== req.params.id), null, 2))
  return res.json({ ok: true })
}))

// ── AI Chat ───────────────────────────────────────────────────────────────────
app.post('/api/chat', aiRateLimit, requireAuth, asyncRoute(async (req, res) => {
  const llm = getLLMService()
  if (!llm) return res.status(503).json({ error: 'AI unavailable. Set GEMINI_API_KEY.' })
  const { prompt, location, model, classId, subjectId } = req.body || {}
  if (!prompt) return res.status(400).json({ error: 'prompt is required' })
  let ragContext = ''
  try { ragContext = await buildContext(prompt, { classId, subjectId, topK: 3 }) } catch {}
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

// ── Register attendance flush function ────────────────────────────────────────
registerAttendanceFlusher(async (records) => {
  for (const r of records) {
    try {
      await dbRun(
        `INSERT OR IGNORE INTO attendance (session_id, student_id, status, verified_at) VALUES (?,?,?,?)`,
        [r.sessionId, r.studentId, r.status || 'present', r.verifiedAt || new Date().toISOString()]
      )
    } catch (err) {
      console.error('Attendance flush insert error:', err.message)
    }
  }
})

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err, req, res, _next) => {
  console.error('Unhandled server error:', err)
  const status = err.status || 500
  const message = err instanceof Error ? err.message : 'Internal server error'
  res.status(status).json({ error: message })
})

process.on('uncaughtException',    err  => console.error('Uncaught Exception:', err))
process.on('unhandledRejection',   reason => console.error('Unhandled Rejection:', reason))
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
