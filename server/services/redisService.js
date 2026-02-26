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
let lastFlushAt = null
let lastFlushError = null

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
    // Clear dedup keys for flushed records so seen set doesn't grow unboundedly
    for (const r of records) {
      localAttendanceSeen.delete(`attend:seen:${r.sessionId}:${r.studentId}`)
    }
  }
  try {
    await attendanceFlusher(records)
    lastFlushAt = Date.now()
    lastFlushError = null
  } catch (err) {
    lastFlushError = err.message
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
//
// When Redis is available the circuit breaker state is stored there so all
// server instances share a single view of service health.
//
//   cb:{name}:open     — key exists while circuit is open (TTL = cooldown)
//   cb:{name}:failures — integer failure count (TTL = 2× cooldown for auto-reset)
//
// When Redis is unavailable it falls back to the in-process Map (original
// behaviour) so auth/AI keeps working without Redis.
//
const CB_DEFAULTS = { threshold: 3, cooldownMs: 30_000 }
// In-process fallback state
const circuitBreakers = new Map()

function getLocalCB(name) {
  if (!circuitBreakers.has(name)) {
    circuitBreakers.set(name, { failures: 0, threshold: CB_DEFAULTS.threshold, cooldownMs: CB_DEFAULTS.cooldownMs, openedAt: null })
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

// In-process dedup set for when Redis is unavailable (cleared on flush)
const localAttendanceSeen = new Set()

/**
 * Buffer an attendance record for batch insert (non-blocking, ~1 ms).
 * Uses an idempotency key (hash of sessionId+studentId) to prevent
 * duplicate records from race conditions in the 5-second flush window.
 * Returns true if buffered, false if already buffered (duplicate).
 */
export async function bufferAttendance(record) {
  const dedupKey = `attend:seen:${record.sessionId}:${record.studentId}`
  if (redisOk) {
    // SETNX with TTL: if key already exists, this is a duplicate
    const added = await redis.set(dedupKey, '1', 'EX', 30, 'NX')
    if (!added) return false   // duplicate — already buffered this cycle
    await redis.rpush(ATTEND_BUFFER_KEY, JSON.stringify(record))
  } else {
    if (localAttendanceSeen.has(dedupKey)) return false
    localAttendanceSeen.add(dedupKey)
    localAttendanceBuffer.push(record)
  }
  return true
}

/**
 * Check if a student's attendance is already buffered for a session.
 * Used by the route to give a meaningful response on duplicate submissions.
 */
export async function isStudentInBuffer(sessionId, studentId) {
  const dedupKey = `attend:seen:${sessionId}:${studentId}`
  if (redisOk) {
    return (await redis.exists(dedupKey)) === 1
  }
  return localAttendanceSeen.has(dedupKey)
}

/** Force an immediate flush (e.g. on server shutdown). */
export async function flushAttendanceNow() {
  await flushAttendance()
}

/** Return attendance buffer health metrics for the /health endpoint. */
export async function attendanceBufferStats() {
  let queueDepth = localAttendanceBuffer.length
  if (redisOk) {
    try { queueDepth = await redis.llen(ATTEND_BUFFER_KEY) } catch {}
  }
  const flushLagMs = lastFlushAt ? Date.now() - lastFlushAt : null
  return { queueDepth, flushLagMs, lastFlushError }
}

/**
 * Circuit breaker: check if a service is currently tripped.
 *
 * Redis mode:  checks existence of key cb:{name}:open (set with TTL on trip).
 *              All server instances see the same state.
 * Fallback:    reads from in-process Map.
 *
 * @returns {boolean} true = circuit OPEN (service unavailable), false = OK
 */
export async function isCircuitOpen(name) {
  if (redisOk) {
    try {
      return (await redis.exists(`cb:${name}:open`)) === 1
    } catch { /* Redis hiccup — fall through to local */ }
  }
  const cb = getLocalCB(name)
  if (cb.openedAt && Date.now() - cb.openedAt < cb.cooldownMs) return true
  if (cb.openedAt) { cb.failures = 0; cb.openedAt = null }
  return false
}

/**
 * Record a failure for the circuit breaker.
 * In Redis mode, uses INCR + EXPIRE so the counter is shared across instances.
 * The circuit trips when the failure count reaches the threshold within the
 * cooldown window.
 */
export async function recordFailure(name, opts = {}) {
  const threshold  = opts.threshold  || CB_DEFAULTS.threshold
  const cooldownMs = opts.cooldownMs || CB_DEFAULTS.cooldownMs
  const cooldownS  = Math.ceil(cooldownMs / 1000)
  if (redisOk) {
    try {
      const failKey = `cb:${name}:failures`
      const openKey = `cb:${name}:open`
      const count = await redis.incr(failKey)
      await redis.expire(failKey, cooldownS * 2)   // auto-reset after 2× cooldown
      if (count >= threshold) {
        // NX so the first instance to trip doesn't keep resetting TTL
        const tripped = await redis.set(openKey, '1', 'EX', cooldownS, 'NX')
        if (tripped) console.warn(`⚡ Circuit breaker OPEN (Redis): ${name} — ${count} failures`)
      }
      return
    } catch { /* fall through */ }
  }
  // In-process fallback
  const cb = getLocalCB(name)
  cb.failures++
  if (cb.failures >= threshold) {
    cb.openedAt = Date.now()
    cb.cooldownMs = cooldownMs
    console.warn(`⚡ Circuit breaker OPEN (local): ${name}`)
  }
}

/**
 * Record a success — resets failure counter so the circuit closes.
 */
export async function recordSuccess(name) {
  if (redisOk) {
    try {
      await redis.del(`cb:${name}:failures`, `cb:${name}:open`)
      return
    } catch { /* fall through */ }
  }
  const cb = getLocalCB(name)
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
