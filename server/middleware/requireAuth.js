/**
 * server/middleware/requireAuth.js
 *
 * JWT Bearer-token authentication middleware.
 * Attaches decoded payload to req.user.
 *
 * Role re-validation: on every request the user's current role is fetched
 * from the DB (cached for 5 minutes per userId) so that demotions and
 * account disablement take effect without waiting for JWT expiry.
 */

import jwt from 'jsonwebtoken'
import { get as dbGet } from '../database.js'

const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is not set. Refusing to start.')
  process.exit(1)
}

// In-process role cache: userId → { role, expiresAt }
// Keeps DB round-trips at ~1 per 5 minutes per active user instead of per-request.
const roleCache = new Map()
const ROLE_CACHE_TTL_MS = 5 * 60 * 1000  // 5 minutes

async function getCurrentRole(userId) {
  const cached = roleCache.get(userId)
  if (cached && cached.expiresAt > Date.now()) return cached.role
  try {
    const row = await dbGet(`SELECT role FROM users WHERE id = ?`, [userId])
    if (!row) return null
    roleCache.set(userId, { role: row.role, expiresAt: Date.now() + ROLE_CACHE_TTL_MS })
    return row.role
  } catch {
    // DB unavailable — fall back to JWT claim so auth doesn't break during DB outage
    return null
  }
}

export async function requireAuth(req, res, next) {
  try {
    const auth = req.headers.authorization || ''
    if (!auth.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or malformed Authorization header' })
    }
    const token = auth.slice(7)
    const payload = jwt.verify(token, JWT_SECRET)

    // Re-validate role against DB to catch demotions / account disablement
    // that occurred after the JWT was issued (7-day window).
    const currentRole = await getCurrentRole(payload.id)
    if (currentRole === null) {
      // User deleted or DB unreachable — trust JWT role on DB failure
      req.user = payload
    } else if (currentRole !== payload.role) {
      // Role was changed server-side; update the in-request user object
      // so downstream middleware sees the correct role.
      req.user = { ...payload, role: currentRole }
    } else {
      req.user = payload
    }

    return next()
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }
}

/** Invalidate cached role for a user (call after role updates). */
export function invalidateRoleCache(userId) {
  roleCache.delete(userId)
}
