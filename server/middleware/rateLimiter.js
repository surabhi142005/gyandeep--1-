/**
 * server/middleware/rateLimiter.js — Sliding-window rate limiter
 *
 * In-process implementation (no Redis needed) with periodic cleanup.
 * For production at scale, replace with `express-rate-limit` + Redis store.
 *
 * Key strategy:
 *   - Authenticated routes use req.user.id as the rate limit key.
 *     This prevents the NAT problem where 3,000 students behind one
 *     school IP would all share a single bucket and hit the limit instantly.
 *   - Unauthenticated routes (auth, reset) always use IP.
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
 * Resolve the rate limit key for a request.
 * Uses authenticated user ID when available (prevents NAT IP sharing).
 * Falls back to IP for unauthenticated requests.
 */
function resolveKey(req, prefix = '') {
  const id = req.user?.id || req.ip || req.headers['x-forwarded-for'] || 'unknown'
  return prefix ? `${prefix}-${id}` : id
}

/**
 * Factory: returns an Express middleware for rate limiting.
 *
 * @param {{ windowMs?: number, max?: number, keyFn?: (req) => string, useUserId?: boolean }} opts
 *
 * useUserId (default true): when true and req.user exists, key is prefixed
 * with the authenticated user ID rather than the client IP. Set to false
 * for unauthenticated routes (login, register) where req.user is not set.
 */
export function rateLimit({ windowMs = 60_000, max = 30, keyFn, useUserId = true } = {}) {
  return (req, res, next) => {
    const key = keyFn
      ? keyFn(req)
      : useUserId
        ? resolveKey(req)
        : (req.ip || req.headers['x-forwarded-for'] || 'unknown')
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

/**
 * General API: 60 req/min per authenticated user ID (or IP if unauthenticated).
 * Prevents the NAT problem where all students behind one school IP share a bucket.
 */
export const generalRateLimit = rateLimit({ windowMs: 60_000, max: 60, useUserId: true })

/**
 * AI endpoints: 20 req/min per authenticated user ID.
 * Higher than before because it's now per-user, not per-IP.
 * A teacher and 30 students no longer compete for the same 10-request bucket.
 */
export const aiRateLimit = rateLimit({
  windowMs: 60_000,
  max: 20,
  keyFn: req => `ai-${req.user?.id || req.ip || 'unknown'}`,
})

/**
 * Auth endpoints: 10 attempts/15 min per IP.
 * Intentionally IP-based — user ID is not available at login time.
 * This is the correct brute-force mitigation for unauthenticated routes.
 */
export const authRateLimit = rateLimit({
  windowMs: 15 * 60_000,
  max: 10,
  useUserId: false,   // IP-only: req.user is not set yet at login/register
  keyFn: req => `auth-${req.ip || 'unknown'}`,
})

/**
 * Password reset/OTP: 5 attempts/15 min per email (or userId, or IP).
 * Keyed by email/userId from the request body so enumeration is harder.
 */
export const resetRateLimit = rateLimit({
  windowMs: 15 * 60_000,
  max: 5,
  keyFn: req => `reset-${(req.body?.email || req.body?.userId || req.ip || 'unknown').toString().toLowerCase()}`,
})
