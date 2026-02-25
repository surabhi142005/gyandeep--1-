/**
 * server/routes/admin.js — Admin-only routes
 *
 * GET  /api/admin/users
 * GET  /api/admin/audit-logs
 * POST /api/admin/override
 * GET  /api/admin/stats
 */

import { Router } from 'express'
import fs from 'fs'
import path from 'path'
import { requireAuth } from '../middleware/requireAuth.js'
import { ensureRole } from '../middleware/rbac.js'
import { asyncRoute } from '../middleware/validate.js'
import { toPublicUser } from '../middleware/sanitizeResponse.js'
import { readUsers } from '../controllers/userStore.js'
import { all as dbAll, run as dbRun } from '../database.js'

const router = Router()
const dataDir = path.join(process.cwd(), 'server', 'data')
const auditLogFile = path.join(dataDir, 'audit.json')

// All admin routes require authentication + admin role
router.use(requireAuth, ensureRole('admin'))

// ── List all users (no sensitive fields) ──────────────────────────────────────
router.get('/users', asyncRoute(async (req, res) => {
  const users = await readUsers()
  return res.json(users.map(toPublicUser))
}))

// ── Audit logs ────────────────────────────────────────────────────────────────
router.get('/audit-logs', asyncRoute(async (req, res) => {
  const limit = parseInt(String(req.query.limit || '100'))
  const type = req.query.type ? String(req.query.type) : null
  try {
    let sql = `SELECT * FROM audit_logs`
    const params = []
    if (type) { sql += ` WHERE type = ?`; params.push(type) }
    sql += ` ORDER BY ts DESC LIMIT ?`; params.push(limit)
    const rows = await dbAll(sql, params)
    return res.json(rows || [])
  } catch {
    // fallback to file
    if (!fs.existsSync(auditLogFile)) return res.json([])
    const logs = JSON.parse(fs.readFileSync(auditLogFile, 'utf8') || '[]')
    const filtered = type ? logs.filter(l => l.type === type) : logs
    return res.json(filtered.slice(-limit).reverse())
  }
}))

// ── Admin override (audited) ──────────────────────────────────────────────────
router.post('/override', asyncRoute(async (req, res) => {
  const { userId, action, reason } = req.body || {}
  if (!userId || !action) return res.status(400).json({ error: 'userId and action are required' })
  const entry = { ts: Date.now(), type: 'admin_override', adminId: req.user.id, userId, action, reason: reason || '' }
  try {
    await dbRun(`INSERT INTO audit_logs (ts, type, userId, details) VALUES (?,?,?,?)`,
      [entry.ts, entry.type, req.user.id, JSON.stringify(entry)])
  } catch {
    try {
      if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true })
      const existing = fs.existsSync(auditLogFile) ? JSON.parse(fs.readFileSync(auditLogFile, 'utf8') || '[]') : []
      existing.push(entry)
      fs.writeFileSync(auditLogFile, JSON.stringify(existing, null, 2))
    } catch {}
  }
  return res.json({ ok: true })
}))

// ── Platform stats ────────────────────────────────────────────────────────────
router.get('/stats', asyncRoute(async (req, res) => {
  const users = await readUsers()
  const students = users.filter(u => u.role === 'student').length
  const teachers = users.filter(u => u.role === 'teacher').length
  const admins   = users.filter(u => u.role === 'admin').length
  return res.json({ totalUsers: users.length, students, teachers, admins })
}))

export default router
