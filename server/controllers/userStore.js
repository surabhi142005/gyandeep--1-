/**
 * server/controllers/userStore.js
 *
 * Centralised read/write for the users collection.
 * Tries SQLite first, falls back to users.json.
 * All callers should use these functions — never read the file directly.
 */

import fs from 'fs'
import path from 'path'
import { all as dbAll, run as dbRun } from '../database.js'

const dataDir   = path.join(process.cwd(), 'server', 'data')
const usersFile = path.join(dataDir, 'users.json')

function ensureDataDir() {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true })
}

export async function readUsers() {
  try {
    const rows = await dbAll(`SELECT * FROM users`)
    if (Array.isArray(rows) && rows.length > 0) {
      return rows.map(r => ({
        id:               r.id,
        name:             r.name,
        email:            r.email,
        role:             r.role,
        passwordHash:     r.password,        // stored as 'password' column in SQLite schema
        googleId:         r.googleId,
        faceImage:        r.faceImage,
        emailVerified:    !!r.emailVerified,
        preferences:      r.preferences      ? JSON.parse(r.preferences)      : {},
        history:          r.history          ? JSON.parse(r.history)          : [],
        assignedSubjects: r.assignedSubjects ? JSON.parse(r.assignedSubjects) : [],
        performance:      r.performance      ? JSON.parse(r.performance)      : [],
        classId:          r.classId,
      }))
    }
  } catch { /* DB not available */ }
  try {
    if (!fs.existsSync(usersFile)) return []
    return JSON.parse(fs.readFileSync(usersFile, 'utf8') || '[]')
  } catch { return [] }
}

export async function writeUsers(users) {
  try {
    await dbRun(`DELETE FROM users`)
    for (const u of users) {
      await dbRun(
        `INSERT OR REPLACE INTO users
          (id, name, email, role, password, googleId, faceImage, preferences, history, assignedSubjects, performance, classId)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          u.id, u.name || null, u.email || null, u.role || null,
          u.passwordHash || u.password || null, u.googleId || null, u.faceImage || null,
          JSON.stringify(u.preferences || {}), JSON.stringify(u.history || []),
          JSON.stringify(u.assignedSubjects || []), JSON.stringify(u.performance || []),
          u.classId || null,
        ]
      )
    }
    return true
  } catch {
    try {
      ensureDataDir()
      fs.writeFileSync(usersFile, JSON.stringify(users, null, 2), 'utf8')
      return true
    } catch { return false }
  }
}

export async function findUserById(id) {
  const users = await readUsers()
  return users.find(u => u.id === id) || null
}

export async function findUserByEmail(email) {
  const users = await readUsers()
  return users.find(u => (u.email || '').toLowerCase() === (email || '').toLowerCase()) || null
}

export async function updateUser(id, patch) {
  const users = await readUsers()
  const idx = users.findIndex(u => u.id === id)
  if (idx === -1) return null
  users[idx] = { ...users[idx], ...patch }
  await writeUsers(users)
  return users[idx]
}
