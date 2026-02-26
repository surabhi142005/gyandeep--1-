/**
 * server/controllers/userStore.js
 *
 * Centralised read/write for the users collection.
 * Tries SQLite first, falls back to users.json.
 * All callers should use these functions — never read the file directly.
 */

import fs from 'fs'
import path from 'path'
import { all as dbAll, get as dbGet, run as dbRun, getDB } from '../database.js'

// Lazily imported to avoid circular dependency (requireAuth → database ← userStore → requireAuth)
let _invalidateRoleCache = null
async function invalidateRoleCache(userId) {
  if (!_invalidateRoleCache) {
    try {
      const mod = await import('../middleware/requireAuth.js')
      _invalidateRoleCache = mod.invalidateRoleCache
    } catch { return }
  }
  _invalidateRoleCache(userId)
}

const dataDir   = path.join(process.cwd(), 'server', 'data')
const usersFile = path.join(dataDir, 'users.json')

function ensureDataDir() {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true })
}

// Columns to select when faceImage is not needed (all hot-path queries).
// Avoids loading potentially large base64 blobs on every auth/user-list call.
const PUBLIC_COLS = 'id, name, email, role, password, googleId, emailVerified, preferences, history, assignedSubjects, performance, classId'

function mapRow(r, includeFaceImage = false) {
  return {
    id:               r.id,
    name:             r.name,
    email:            r.email,
    role:             r.role,
    passwordHash:     r.password,        // stored as 'password' column in SQLite schema
    googleId:         r.googleId,
    faceImage:        includeFaceImage ? (r.faceImage ?? null) : undefined,
    emailVerified:    !!r.emailVerified,
    preferences:      r.preferences      ? JSON.parse(r.preferences)      : {},
    history:          r.history          ? JSON.parse(r.history)          : [],
    assignedSubjects: r.assignedSubjects ? JSON.parse(r.assignedSubjects) : [],
    performance:      r.performance      ? JSON.parse(r.performance)      : [],
    classId:          r.classId,
  }
}

/**
 * Read all users. By default excludes the faceImage blob for performance.
 * Pass { includeFaceImage: true } only in face-auth code paths.
 */
export async function readUsers({ includeFaceImage = false } = {}) {
  try {
    const cols = includeFaceImage ? '*' : PUBLIC_COLS
    const rows = await dbAll(`SELECT ${cols} FROM users`)
    if (Array.isArray(rows) && rows.length > 0) {
      return rows.map(r => mapRow(r, includeFaceImage))
    }
  } catch { /* DB not available */ }
  try {
    if (!fs.existsSync(usersFile)) return []
    return JSON.parse(fs.readFileSync(usersFile, 'utf8') || '[]')
  } catch { return [] }
}

export async function writeUsers(users) {
  try {
    const db = getDB()
    // Wrap entire replace in a transaction to prevent partial writes on crash
    await new Promise((resolve, reject) => {
      db.serialize(() => {
        db.run('BEGIN TRANSACTION', (err) => { if (err) return reject(err) })
        db.run('DELETE FROM users', (err) => { if (err) { db.run('ROLLBACK'); return reject(err) } })
        const stmt = db.prepare(
          `INSERT OR REPLACE INTO users
            (id, name, email, role, password, googleId, faceImage, emailVerified, preferences, history, assignedSubjects, performance, classId)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`
        )
        for (const u of users) {
          stmt.run([
            u.id, u.name || null, u.email || null, u.role || 'student',
            u.passwordHash || u.password || null, u.googleId || null, u.faceImage || null,
            u.emailVerified ? 1 : 0,
            JSON.stringify(u.preferences || {}), JSON.stringify(u.history || []),
            JSON.stringify(u.assignedSubjects || []), JSON.stringify(u.performance || []),
            u.classId || null,
          ])
        }
        stmt.finalize((err) => {
          if (err) { db.run('ROLLBACK'); return reject(err) }
          db.run('COMMIT', (err2) => { if (err2) return reject(err2); resolve() })
        })
      })
    })
    return true
  } catch {
    try {
      ensureDataDir()
      fs.writeFileSync(usersFile, JSON.stringify(users, null, 2), 'utf8')
      return true
    } catch { return false }
  }
}

/**
 * Fast O(1) lookup by id using the SQLite PRIMARY KEY index.
 * Falls back to full readUsers() scan only if DB is unavailable.
 */
export async function findUserById(id, opts = {}) {
  try {
    const cols = opts.includeFaceImage ? '*' : PUBLIC_COLS
    const row = await dbGet(`SELECT ${cols} FROM users WHERE id = ?`, [id])
    if (row) return mapRow(row, opts.includeFaceImage || false)
  } catch { /* DB unavailable — fall through */ }
  const users = await readUsers(opts)
  return users.find(u => u.id === id) || null
}

/**
 * Fast O(1) lookup by email using idx_users_email index.
 * Critical hot path: called on every login, registration check, and OTP send.
 * Replaces the previous pattern of loading all users then filtering in JS.
 * Falls back to full scan only if DB is unavailable.
 */
export async function findUserByEmail(email, opts = {}) {
  const safeEmail = (email || '').toLowerCase()
  try {
    const cols = opts.includeFaceImage ? '*' : PUBLIC_COLS
    const row = await dbGet(`SELECT ${cols} FROM users WHERE LOWER(email) = ?`, [safeEmail])
    if (row !== undefined) return row ? mapRow(row, opts.includeFaceImage || false) : null
  } catch { /* DB unavailable — fall through */ }
  const users = await readUsers(opts)
  return users.find(u => (u.email || '').toLowerCase() === safeEmail) || null
}

export async function updateUser(id, patch) {
  // Build a targeted SQL UPDATE to avoid full table rewrite
  try {
    const colMap = {
      name: 'name', email: 'email', role: 'role',
      passwordHash: 'password', password: 'password',
      googleId: 'googleId', faceImage: 'faceImage',
      emailVerified: 'emailVerified', classId: 'classId',
      preferences: 'preferences', history: 'history',
      assignedSubjects: 'assignedSubjects', performance: 'performance',
    }
    const setClauses = []
    const values = []
    for (const [key, val] of Object.entries(patch)) {
      const col = colMap[key]
      if (!col) continue
      if (['preferences', 'history', 'assignedSubjects', 'performance'].includes(key)) {
        setClauses.push(`${col} = ?`)
        values.push(JSON.stringify(val))
      } else if (key === 'emailVerified') {
        setClauses.push(`${col} = ?`)
        values.push(val ? 1 : 0)
      } else {
        setClauses.push(`${col} = ?`)
        values.push(val ?? null)
      }
    }
    if (setClauses.length > 0) {
      values.push(id)
      await dbRun(`UPDATE users SET ${setClauses.join(', ')} WHERE id = ?`, values)
      // Invalidate role cache if role changed so requireAuth picks up the new role immediately
      if ('role' in patch) await invalidateRoleCache(id)
    }
    return await findUserById(id)
  } catch {
    // Fallback: full rewrite via JSON path
    const users = await readUsers()
    const idx = users.findIndex(u => u.id === id)
    if (idx === -1) return null
    users[idx] = { ...users[idx], ...patch }
    await writeUsers(users)
    return users[idx]
  }
}
