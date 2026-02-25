/**
 * server/middleware/rbac.js — Role-Based Access Control
 *
 * Usage:
 *   import { ensureRole } from '../middleware/rbac.js'
 *   app.post('/api/notes/upload', requireAuth, ensureRole('teacher', 'admin'), handler)
 *
 * Always compose AFTER requireAuth so req.user is populated.
 */

/**
 * Returns middleware that allows only requests whose req.user.role
 * is one of the provided allowed roles.
 *
 * @param {...string} roles  e.g. ensureRole('teacher', 'admin')
 */
export function ensureRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' })
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Forbidden: requires role ${roles.join(' or ')}`,
      })
    }
    return next()
  }
}
