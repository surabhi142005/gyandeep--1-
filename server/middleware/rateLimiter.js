/**
 * server/middleware/rateLimiter.js — Sliding-window rate limiter
 *
 * In-process implementation (no Redis needed) with periodic cleanup.
 * For production at scale, replace with `express-rate-limit` + Redis store.
 *
 * Usage:
 *   import { rateLimit, aiRateLimit, authRateLimit } from '../middleware/rateLimiter.js'
 *   app.post('/api/auth/login', authRateLimit, handler)
 */

/** @type {Map<string, { hits: number[], blocked: number }>} */
const store = new Map()

// Periodic cleanup — purge expired windows every minute
setInterval(() => {
  const now = Date.now()
  for (const [key, rec] of store) {
    rec.hits = rec.hits.filter(t => t > now - 120_000)
    if (rec.hits.length === 0) store.delete(key)
  }
}, 60_000)

/**
 * Factory: returns an Express middleware for rate limiting.
 *
 * @param {{ windowMs?: number, max?: number, keyFn?: (req) => string }} opts
 */
export function rateLimit({ windowMs = 60_000, max = 30, keyFn } = {}) {
  return (req, res, next) => {
    const key = keyFn ? keyFn(req) : (req.ip || req.headers['x-forwarded-for'] || 'unknown')
    const now = Date.now()
    let rec = store.get(key)
    if (!rec) {
      rec = { hits: [], blocked: 0 }
      store.set(key, rec)
    }
    rec.hits = rec.hits.filter(t => t > now - windowMs)
    if (rec.hits.length >= max) {
      const retryAfter = Math.ceil((rec.hits[0] + windowMs - now) / 1000)
      res.set('Retry-After', String(retryAfter))
      return res.status(429).json({ error: 'Too many requests. Please try again later.', retryAfter })
    }
    rec.hits.push(now)
    return next()
  }
}

/** General API: 60 req/min per IP */
export const generalRateLimit = rateLimit({ windowMs: 60_000, max: 60 })

/** AI endpoints: 10 req/min per IP */
export const aiRateLimit = rateLimit({
  windowMs: 60_000,
  max: 10,
  keyFn: req => `ai-${req.ip || 'unknown'}`,
})

/** Auth endpoints: 10 attempts/15 min per IP (brute-force protection) */
export const authRateLimit = rateLimit({
  windowMs: 15 * 60_000,
  max: 10,
  keyFn: req => `auth-${req.ip || 'unknown'}`,
})

/** Password reset/OTP: 5 attempts/15 min per email */
export const resetRateLimit = rateLimit({
  windowMs: 15 * 60_000,
  max: 5,
  keyFn: req => `reset-${(req.body?.email || req.body?.userId || req.ip || 'unknown').toString().toLowerCase()}`,
})
