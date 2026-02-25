/**
 * server/middleware/requireAuth.js
 *
 * JWT Bearer-token authentication middleware.
 * Attaches decoded payload to req.user.
 */

import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || process.env.SESSION_SECRET || 'gyandeep-jwt-secret'

export function requireAuth(req, res, next) {
  try {
    const auth = req.headers.authorization || ''
    if (!auth.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or malformed Authorization header' })
    }
    const token = auth.slice(7)
    const payload = jwt.verify(token, JWT_SECRET)
    req.user = payload
    return next()
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }
}
