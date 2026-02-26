/**
 * server/routes/auth.js — Authentication routes
 *
 * POST /api/auth/register
 * POST /api/auth/login
 * POST /api/auth/face
 * POST /api/auth/location
 * POST /api/auth/otp/send
 * POST /api/auth/otp/verify
 * POST /api/auth/password/request
 * POST /api/auth/password/verify
 * POST /api/auth/password/complete
 * POST /api/auth/email/verify-send
 * POST /api/auth/email/verify-check
 */

import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import http from 'http'
import { URL } from 'url'
import { requireAuth } from '../middleware/requireAuth.js'
import { authRateLimit, resetRateLimit } from '../middleware/rateLimiter.js'
import { sanitizeEmail, asyncRoute } from '../middleware/validate.js'
import { toPublicUser } from '../middleware/sanitizeResponse.js'
import { setCode, getCode, deleteCode } from '../services/redisService.js'
import { sendPasswordResetEmail, sendEmailVerification } from '../emailService.js'
import { readUsers, writeUsers, findUserByEmail, updateUser } from '../controllers/userStore.js'
import { run as dbRun } from '../database.js'

const router = Router()
const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is not set. Refusing to start.')
  process.exit(1)
}

const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || 'http://localhost:5001'
// Shared secret for Express → Python service communication (prevents direct access to :5001)
const INTERNAL_SERVICE_SECRET = process.env.INTERNAL_SERVICE_SECRET || null

function signToken(user) {
  return jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' })
}

function postJSON(targetUrl, body, extraHeaders = {}) {
  const urlObj = new URL(targetUrl)
  const payload = JSON.stringify(body)
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: urlObj.hostname, port: urlObj.port || 80, path: urlObj.pathname,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload), ...extraHeaders },
    }, (res) => {
      let data = ''
      res.on('data', c => { data += c })
      res.on('end', () => {
        try {
          const json = JSON.parse(data || '{}')
          if (res.statusCode >= 400) { const e = new Error(json.error || `HTTP ${res.statusCode}`); e.status = res.statusCode; return reject(e) }
          resolve(json)
        } catch (e) { reject(e) }
      })
    })
    req.on('error', reject)
    req.write(payload)
    req.end()
  })
}

// ── Register ──────────────────────────────────────────────────────────────────
router.post('/register', authRateLimit, asyncRoute(async (req, res) => {
  const { email, password, name } = req.body || {}
  if (!email || !password) return res.status(400).json({ error: 'email and password are required' })
  const safeEmail = sanitizeEmail(email)
  // O(1) indexed lookup instead of loading all users
  const existing = await findUserByEmail(safeEmail)
  if (existing) return res.status(409).json({ error: 'User already exists' })
  const passwordHash = await bcrypt.hash(String(password), 12)
  const user = { id: `u-${Date.now()}`, email: safeEmail, name: name || safeEmail.split('@')[0], passwordHash, role: 'student' }
  // Insert single row directly — avoid the delete+reinsert of writeUsers()
  const { run: dbRunDirect } = await import('../database.js')
  try {
    await dbRunDirect(
      `INSERT INTO users (id, name, email, role, password, emailVerified, preferences, history, assignedSubjects, performance) VALUES (?,?,?,?,?,0,'{}','[]','[]','[]')`,
      [user.id, user.name, user.email, user.role, user.passwordHash]
    )
  } catch {
    // DB unavailable — fall back to full writeUsers
    const users = await readUsers()
    users.push(user)
    await writeUsers(users)
  }
  const token = signToken(user)
  return res.json({ token, user: toPublicUser(user) })
}))

// ── Login ─────────────────────────────────────────────────────────────────────
router.post('/login', authRateLimit, asyncRoute(async (req, res) => {
  const { email, password } = req.body || {}
  if (!email || !password) return res.status(400).json({ error: 'email and password are required' })
  const safeEmail = sanitizeEmail(email)
  // O(1) indexed lookup — replaces readUsers() O(n) scan on every login
  const user = await findUserByEmail(safeEmail)
  if (!user || !(user.passwordHash || user.password)) return res.status(401).json({ error: 'Invalid credentials' })
  const hash = user.passwordHash || user.password
  const ok = await bcrypt.compare(String(password), hash)
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' })
  const token = signToken(user)
  // Audit log
  try { await dbRun(`INSERT INTO audit_logs (ts, type, userId, details) VALUES (?,?,?,?)`,
    [Date.now(), 'login', user.id, JSON.stringify({ ip: req.ip })]) } catch {}
  return res.json({ token, user: toPublicUser(user) })
}))

// ── Face auth proxy ───────────────────────────────────────────────────────────
router.post('/face', asyncRoute(async (req, res) => {
  const { image } = req.body || {}
  if (!image) return res.status(400).json({ error: 'image is required' })
  const headers = INTERNAL_SERVICE_SECRET ? { 'X-Internal-Secret': INTERNAL_SERVICE_SECRET } : {}
  const result = await postJSON(`${PYTHON_SERVICE_URL}/auth/face`, { image }, headers)
  return res.json(result)
}))

// ── Location check proxy ──────────────────────────────────────────────────────
router.post('/location', asyncRoute(async (req, res) => {
  const { lat, lng, target_lat, target_lng, radius_m } = req.body || {}
  if (typeof lat !== 'number' || typeof lng !== 'number' ||
      typeof target_lat !== 'number' || typeof target_lng !== 'number') {
    return res.status(400).json({ error: 'lat, lng, target_lat, target_lng are required numbers' })
  }
  // Server-side Haversine as fallback (don't trust client-only)
  const R = 6371000
  const dLat = (target_lat - lat) * Math.PI / 180
  const dLng = (target_lng - lng) * Math.PI / 180
  const a = Math.sin(dLat/2)**2 + Math.cos(lat * Math.PI/180) * Math.cos(target_lat * Math.PI/180) * Math.sin(dLng/2)**2
  const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  const radius = typeof radius_m === 'number' ? radius_m : 100
  if (dist <= radius) return res.json({ ok: true, distance: dist })
  // Try Python service for additional verification
  try {
    const headers = INTERNAL_SERVICE_SECRET ? { 'X-Internal-Secret': INTERNAL_SERVICE_SECRET } : {}
    const result = await postJSON(`${PYTHON_SERVICE_URL}/auth/location`, { lat, lng, target_lat, target_lng, radius_m }, headers)
    return res.json(result)
  } catch {
    return res.status(403).json({ ok: false, distance: dist, error: 'Outside allowed radius' })
  }
}))

// ── OTP ───────────────────────────────────────────────────────────────────────
router.post('/otp/send', resetRateLimit, asyncRoute(async (req, res) => {
  const { userId, email } = req.body || {}
  if (!userId) return res.status(400).json({ error: 'userId is required' })
  // Use crypto.randomBytes for cryptographically secure OTP
  const code = (parseInt(crypto.randomBytes(3).toString('hex'), 16) % 900000 + 100000).toString()
  const expires = Date.now() + 5 * 60 * 1000
  await setCode('otp', userId, code, 300)
  let targetEmail = email
  if (!targetEmail) {
    // O(1) indexed lookup instead of O(n) full scan
    const { findUserById } = await import('../controllers/userStore.js')
    const u = await findUserById(userId)
    targetEmail = u?.email
  }
  if (targetEmail) {
    try { await sendEmailVerification(targetEmail, code) } catch (e) { console.error('OTP email failed:', e.message) }
  }
  return res.json({ ok: true, expires })
}))

router.post('/otp/verify', resetRateLimit, asyncRoute(async (req, res) => {
  const { userId, code } = req.body || {}
  if (!userId || !code) return res.status(400).json({ error: 'userId and code are required' })
  const rec = await getCode('otp', userId)
  if (!rec || rec.code !== String(code)) return res.status(401).json({ error: 'Invalid or expired code' })
  await deleteCode('otp', userId)
  try { await dbRun(`INSERT INTO audit_logs (ts, type, userId, details) VALUES (?,?,?,?)`,
    [Date.now(), 'otp_verify', userId, JSON.stringify({ ok: true })]) } catch {}
  return res.json({ ok: true })
}))

// ── Password reset ────────────────────────────────────────────────────────────
router.post('/password/request', resetRateLimit, asyncRoute(async (req, res) => {
  const { email } = req.body || {}
  if (!email) return res.status(400).json({ error: 'email is required' })
  const safeEmail = sanitizeEmail(email)
  // O(1) indexed lookup instead of O(n) full scan
  const existingUser = await findUserByEmail(safeEmail)
  const exists = !!existingUser
  // Don't reveal if email exists (prevents enumeration)
  const code = (parseInt(crypto.randomBytes(3).toString('hex'), 16) % 900000 + 100000).toString()
  const expires = Date.now() + 10 * 60 * 1000
  if (exists) {
    await setCode('reset', safeEmail, code, 600)
    try { await sendPasswordResetEmail(safeEmail, code) } catch (e) { console.error('Reset email failed:', e.message) }
  }
  return res.json({ ok: true, expires })
}))

router.post('/password/verify', resetRateLimit, asyncRoute(async (req, res) => {
  const { email, code } = req.body || {}
  if (!email || !code) return res.status(400).json({ error: 'email and code are required' })
  const safeEmail = sanitizeEmail(email)
  const rec = await getCode('reset', safeEmail)
  if (!rec || rec.code !== String(code)) return res.status(401).json({ error: 'Invalid or expired code' })
  return res.json({ ok: true })
}))

router.post('/password/complete', resetRateLimit, asyncRoute(async (req, res) => {
  const { email, code, newPassword } = req.body || {}
  if (!email || !code || !newPassword) return res.status(400).json({ error: 'email, code, and newPassword are required' })
  if (String(newPassword).length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' })
  const safeEmail = sanitizeEmail(email)
  const rec = await getCode('reset', safeEmail)
  if (!rec || rec.code !== String(code)) return res.status(401).json({ error: 'Invalid or expired code' })
  // O(1) lookup then targeted UPDATE — no full table rewrite
  const user = await findUserByEmail(safeEmail)
  if (!user) return res.status(404).json({ error: 'User not found' })
  const newHash = await bcrypt.hash(String(newPassword), 12)
  await updateUser(user.id, { passwordHash: newHash })
  await deleteCode('reset', safeEmail)
  return res.json({ ok: true })
}))

// ── Email verification ────────────────────────────────────────────────────────
router.post('/email/verify-send', resetRateLimit, asyncRoute(async (req, res) => {
  const { email } = req.body || {}
  if (!email) return res.status(400).json({ error: 'email is required' })
  const safeEmail = sanitizeEmail(email)
  const code = (parseInt(crypto.randomBytes(3).toString('hex'), 16) % 900000 + 100000).toString()
  const expires = Date.now() + 10 * 60 * 1000
  await setCode('email_verify', safeEmail, code, 600)
  try { await sendEmailVerification(safeEmail, code) } catch (e) { console.error('Verify email failed:', e.message) }
  return res.json({ ok: true, expires })
}))

router.post('/email/verify-check', resetRateLimit, asyncRoute(async (req, res) => {
  const { email, code } = req.body || {}
  if (!email || !code) return res.status(400).json({ error: 'email and code are required' })
  const safeEmail = sanitizeEmail(email)
  const rec = await getCode('email_verify', safeEmail)
  if (!rec || rec.code !== String(code)) return res.status(401).json({ error: 'Invalid or expired code' })
  // O(1) indexed lookup + targeted UPDATE — no full table rewrite
  const user = await findUserByEmail(safeEmail)
  if (user) await updateUser(user.id, { emailVerified: true })
  await deleteCode('email_verify', safeEmail)
  return res.json({ ok: true })
}))

export default router
