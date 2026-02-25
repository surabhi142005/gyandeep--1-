/**
 * server/services/redisService.js — Redis abstraction layer
 *
 * Provides:
 *  - Active class session storage with TTL (replaces in-memory maps)
 *  - OTP / password-reset code storage with TTL
 *  - Attendance write buffer (batch inserts)
 *  - Circuit breaker state for AI endpoints
 *
 * Degrades gracefully to an in-process Map when Redis is not available.
 */

import crypto from 'crypto'

// ─── Redis probe ──────────────────────────────────────────────────────────────
let redis = null
let redisOk = false

try {
  const { default: Redis } = await import('ioredis')
  const host = process.env.REDIS_HOST || '127.0.0.1'
  const port = parseInt(process.env.REDIS_PORT || '6379')
  const client = new Redis({ host, port, maxRetriesPerRequest: 1, lazyConnect: true, enableOfflineQueue: false, retryStrategy: () => null })
  await client.connect()
  await client.ping()
  redis = client
  redisOk = true
  console.log(`✅ Redis connected at ${host}:${port} (redisService)`)
} catch {
  console.warn('⚠️  Redis not available — redisService using in-process fallback')
}

// ─── In-process fallback store ───────────────────────────────────────────────
/** @type {Map<string, { value: string, expiresAt: number }>} */
const memStore = new Map()

// Periodic cleanup of expired in-process keys
setInterval(() => {
  const now = Date.now()
  for (const [k, v] of memStore) {
    if (v.expiresAt && v.expiresAt < now) memStore.delete(k)
  }
}, 30_000)

// ─── Low-level get/set/del with TTL ──────────────────────────────────────────

async function set(key, value, ttlSeconds) {
  const serialised = typeof value === 'string' ? value : JSON.stringify(value)
  if (redisOk) {
    if (ttlSeconds) {
      await redis.setex(key, ttlSeconds, serialised)
    } else {
      await redis.set(key, serialised)
    }
  } else {
    memStore.set(key, {
      value: serialised,
      expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : 0,
    })
  }
}

async function get(key) {
  if (redisOk) {
    return redis.get(key)
  }
  const rec = memStore.get(key)
  if (!rec) return null
  if (rec.expiresAt && rec.expiresAt < Date.now()) {
    memStore.delete(key)
    return null
  }
  return rec.value
}

async function del(key) {
  if (redisOk) {
    await redis.del(key)
  } else {
    memStore.delete(key)
  }
}

async function getJSON(key) {
  const raw = await get(key)
  if (!raw) return null
  try { return JSON.parse(raw) } catch { return raw }
}

// ─── Attendance write buffer ──────────────────────────────────────────────────
const ATTEND_BUFFER_KEY = 'attendance:buffer'
const ATTEND_FLUSH_INTERVAL_MS = 5_000   // flush every 5 s
/** @type {Array<object>} */
const localAttendanceBuffer = []
/** @type {((records: object[]) => Promise<void>) | null} */
let attendanceFlusher = null

/**
 * Register the function that will bulk-insert buffered attendance records.
 * Called once at startup from server/index.js.
 */
export function registerAttendanceFlusher(fn) {
  attendanceFlusher = fn
}

async function flushAttendance() {
  if (!attendanceFlusher) return
  let records = []
  if (redisOk) {
    const raw = await redis.lrange(ATTEND_BUFFER_KEY, 0, 99)
    if (raw.length === 0) return
    await redis.ltrim(ATTEND_BUFFER_KEY, raw.length, -1)
    records = raw.map(r => JSON.parse(r))
  } else {
    if (localAttendanceBuffer.length === 0) return
    records = localAttendanceBuffer.splice(0, 100)
  }
  try {
    await attendanceFlusher(records)
  } catch (err) {
    console.error('Attendance flush error:', err.message)
    // Re-queue on failure so records are not lost
    if (redisOk) {
      for (const r of records) await redis.lpush(ATTEND_BUFFER_KEY, JSON.stringify(r))
    } else {
      localAttendanceBuffer.unshift(...records)
    }
  }
}

setInterval(flushAttendance, ATTEND_FLUSH_INTERVAL_MS)

// ─── Circuit breaker ──────────────────────────────────────────────────────────
const circuitBreakers = new Map()
/**
 * @param {string} name  e.g. 'gemini'
 * @param {{ threshold?: number, cooldownMs?: number }} opts
 */
function getCircuitBreaker(name, opts = {}) {
  if (!circuitBreakers.has(name)) {
    circuitBreakers.set(name, {
      failures: 0,
      threshold: opts.threshold || 3,
      cooldownMs: opts.cooldownMs || 30_000,
      openedAt: null,
    })
  }
  return circuitBreakers.get(name)
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Store an active class session code in Redis with TTL. */
export async function setSessionCode(code, sessionData, ttlSeconds = 600) {
  await set(`session:code:${code}`, sessionData, ttlSeconds)
}

/** Retrieve session data for a given class code (O(1) memory lookup). */
export async function getSessionCode(code) {
  return getJSON(`session:code:${code}`)
}

/** Remove a session code (when teacher ends session). */
export async function deleteSessionCode(code) {
  await del(`session:code:${code}`)
}

/** Store an OTP/reset code for a key (email or userId) with TTL. */
export async function setCode(purpose, key, code, ttlSeconds = 600) {
  await set(`code:${purpose}:${String(key).toLowerCase()}`, { code, createdAt: Date.now() }, ttlSeconds)
}

/** Retrieve and validate a stored code. Returns { code } or null. */
export async function getCode(purpose, key) {
  return getJSON(`code:${purpose}:${String(key).toLowerCase()}`)
}

/** Delete a code after successful use. */
export async function deleteCode(purpose, key) {
  await del(`code:${purpose}:${String(key).toLowerCase()}`)
}

/** Buffer an attendance record for batch insert (non-blocking, ~1 ms). */
export async function bufferAttendance(record) {
  if (redisOk) {
    await redis.rpush(ATTEND_BUFFER_KEY, JSON.stringify(record))
  } else {
    localAttendanceBuffer.push(record)
  }
}

/** Force an immediate flush (e.g. on server shutdown). */
export async function flushAttendanceNow() {
  await flushAttendance()
}

/**
 * Circuit breaker: check if a service is currently tripped.
 * @returns {boolean} true = circuit OPEN (service unavailable), false = OK
 */
export function isCircuitOpen(name) {
  const cb = getCircuitBreaker(name)
  if (cb.openedAt && Date.now() - cb.openedAt < cb.cooldownMs) return true
  if (cb.openedAt) {
    // Half-open: reset and allow one probe
    cb.failures = 0
    cb.openedAt = null
  }
  return false
}

/** Record a failure for the circuit breaker. */
export function recordFailure(name) {
  const cb = getCircuitBreaker(name)
  cb.failures++
  if (cb.failures >= cb.threshold) {
    cb.openedAt = Date.now()
    console.warn(`⚡ Circuit breaker OPEN: ${name}`)
  }
}

/** Record a success (resets failure counter). */
export function recordSuccess(name) {
  const cb = getCircuitBreaker(name)
  cb.failures = 0
  cb.openedAt = null
}

/** Cache AI quiz result keyed by notes hash + subject. */
export async function cacheQuiz(notesHash, subject, quiz) {
  await set(`quiz:cache:${notesHash}:${subject}`, quiz, 86400) // 24 h TTL
}

/** Retrieve cached quiz for given notes hash. */
export async function getCachedQuiz(notesHash, subject) {
  return getJSON(`quiz:cache:${notesHash}:${subject}`)
}

/** Compute SHA-256 hash of notes text for cache key. */
export function hashNotes(text) {
  return crypto.createHash('sha256').update(text).digest('hex')
}

export { redisOk }
