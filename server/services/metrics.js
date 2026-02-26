/**
 * server/services/metrics.js — Prometheus metrics
 *
 * Instruments:
 *   http_requests_total          — counter, labels: method, route, status
 *   http_request_duration_ms     — histogram, labels: method, route
 *   ai_calls_total               — counter, labels: operation, status (success|error|circuit_open)
 *   ai_call_duration_ms          — histogram, labels: operation
 *   attendance_queue_depth       — gauge (updated on each scrape via a collector)
 *   attendance_flush_lag_ms      — gauge (updated on each scrape)
 *
 * Usage:
 *   import { metricsMiddleware, recordAICall, register } from './services/metrics.js'
 *   app.use(metricsMiddleware)
 *   app.get('/metrics', async (req, res) => { res.set('Content-Type', register.contentType); res.end(await register.metrics()) })
 */

import { register, collectDefaultMetrics, Counter, Histogram, Gauge } from 'prom-client'

// ── Default process/Node.js metrics (memory, CPU, GC, event loop lag) ─────────
collectDefaultMetrics({ register })

// ── HTTP request counter ───────────────────────────────────────────────────────
export const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status'],
  registers: [register],
})

// ── HTTP request duration histogram ───────────────────────────────────────────
export const httpRequestDurationMs = new Histogram({
  name: 'http_request_duration_ms',
  help: 'HTTP request duration in milliseconds',
  labelNames: ['method', 'route'],
  buckets: [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000],
  registers: [register],
})

// ── AI call counter ────────────────────────────────────────────────────────────
export const aiCallsTotal = new Counter({
  name: 'ai_calls_total',
  help: 'Total number of AI (Gemini) calls',
  labelNames: ['operation', 'status'],
  registers: [register],
})

// ── AI call duration histogram ─────────────────────────────────────────────────
export const aiCallDurationMs = new Histogram({
  name: 'ai_call_duration_ms',
  help: 'AI call duration in milliseconds',
  labelNames: ['operation'],
  buckets: [100, 500, 1000, 2000, 5000, 10000, 30000],
  registers: [register],
})

// ── Attendance buffer gauges (populated lazily via attendanceBufferStats) ──────
export const attendanceQueueDepth = new Gauge({
  name: 'attendance_queue_depth',
  help: 'Number of attendance records currently buffered awaiting DB flush',
  registers: [register],
})

export const attendanceFlushLagMs = new Gauge({
  name: 'attendance_flush_lag_ms',
  help: 'Milliseconds since the last successful attendance buffer flush',
  registers: [register],
})

// ── Express middleware ─────────────────────────────────────────────────────────

/**
 * Normalise a raw Express route path into a low-cardinality label.
 * e.g. /api/users/u-1234567 → /api/users/:id
 */
function normalisePath(req) {
  // Use the matched route pattern when available (Express 5 sets req.route)
  if (req.route?.path) {
    const base = req.baseUrl || ''
    return base + req.route.path
  }
  // Fall back: strip numeric/UUID-looking segments
  return req.path.replace(/\/[0-9a-f]{8,}(-[0-9a-f]{4,}){2,}/gi, '/:id')
                 .replace(/\/\d+/g, '/:id')
}

export function metricsMiddleware(req, res, next) {
  const start = Date.now()
  res.on('finish', () => {
    const route  = normalisePath(req)
    const method = req.method
    const status = String(res.statusCode)
    const dur    = Date.now() - start
    httpRequestsTotal.inc({ method, route, status })
    httpRequestDurationMs.observe({ method, route }, dur)
  })
  next()
}

// ── AI call helper (called from llmService) ────────────────────────────────────

/**
 * Wrap an AI call and record duration + outcome.
 * @param {string} operation  e.g. 'generateQuiz', 'chat', 'summarize'
 * @param {() => Promise<T>} fn
 * @returns {Promise<T>}
 */
export async function recordAICall(operation, fn) {
  const end = aiCallDurationMs.startTimer({ operation })
  try {
    const result = await fn()
    end()
    aiCallsTotal.inc({ operation, status: 'success' })
    return result
  } catch (err) {
    end()
    const status = err.message?.includes('circuit open') ? 'circuit_open' : 'error'
    aiCallsTotal.inc({ operation, status })
    throw err
  }
}

export { register }
