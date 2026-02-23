/**
 * jobQueue.js — Async Job Queue for Gyandeep
 *
 * Uses BullMQ when Redis is available, falls back to an in-process
 * priority queue so the server starts without any external dependencies.
 *
 * Exported API (same shape in both modes):
 *   addJob(queueName, data, opts?)  → Promise<{ id, queueName }>
 *   getJob(queueName, id)           → Promise<JobStatus | null>
 *   queues                          → Map<string, Queue>  (BullMQ mode only)
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// ─── Redis / BullMQ probe ─────────────────────────────────────────────────────
let bullmqAvailable = false
let Queue, Worker, QueueEvents

try {
  const mod = await import('bullmq')
  Queue = mod.Queue
  Worker = mod.Worker
  QueueEvents = mod.QueueEvents
  bullmqAvailable = true
} catch {
  // BullMQ not installed — use fallback
}

let redisConnection = null
if (bullmqAvailable) {
  try {
    const { default: Redis } = await import('ioredis')
    const host = process.env.REDIS_HOST || '127.0.0.1'
    const port = parseInt(process.env.REDIS_PORT || '6379')
    const client = new Redis({ host, port, maxRetriesPerRequest: null, lazyConnect: true })
    await client.connect()
    redisConnection = client
    console.log(`✅ Redis connected at ${host}:${port}`)
  } catch {
    redisConnection = null
    console.warn('⚠️  Redis unavailable — job queue running in in-process fallback mode')
  }
}

const USE_BULLMQ = bullmqAvailable && redisConnection !== null

// ─── In-process fallback ──────────────────────────────────────────────────────
/**
 * Minimal in-process job store. Jobs are processed immediately in a micro-task
 * (simulating async) and stored in memory + optionally persisted to a JSON file.
 */
const JOBS_FILE = path.join(__dirname, 'data', 'jobs.json')

function loadJobsFromDisk() {
  try {
    if (fs.existsSync(JOBS_FILE)) {
      return JSON.parse(fs.readFileSync(JOBS_FILE, 'utf8') || '{}')
    }
  } catch { /* ignore */ }
  return {}
}

function saveJobsToDisk(store) {
  try {
    const dir = path.dirname(JOBS_FILE)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    // Only persist last 500 jobs to prevent unbounded growth
    const entries = Object.entries(store)
    const trimmed = Object.fromEntries(entries.slice(-500))
    fs.writeFileSync(JOBS_FILE, JSON.stringify(trimmed, null, 2))
  } catch { /* ignore */ }
}

const inProcessStore = loadJobsFromDisk() // { [id]: JobRecord }
const inProcessHandlers = new Map() // queueName → async fn(data) → result

/**
 * Register a processor for a named queue (in-process mode).
 * In BullMQ mode this creates a Worker.
 */
export function registerProcessor(queueName, handler) {
  if (USE_BULLMQ) {
    new Worker(queueName, async (job) => {
      return handler(job.data)
    }, { connection: redisConnection })
  } else {
    inProcessHandlers.set(queueName, handler)
  }
}

// ─── BullMQ queues map ────────────────────────────────────────────────────────
export const queues = new Map()

function getBullQueue(name) {
  if (!queues.has(name)) {
    queues.set(name, new Queue(name, { connection: redisConnection }))
  }
  return queues.get(name)
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Add a job to a named queue.
 * @param {string} queueName
 * @param {object} data
 * @param {{ priority?: number, delay?: number }} [opts]
 * @returns {Promise<{ id: string, queueName: string }>}
 */
export async function addJob(queueName, data, opts = {}) {
  if (USE_BULLMQ) {
    const q = getBullQueue(queueName)
    const job = await q.add(queueName, data, {
      priority: opts.priority,
      delay: opts.delay,
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
    })
    return { id: String(job.id), queueName }
  }

  // In-process: create job record, run handler in background
  const id = `job-${queueName}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  const record = {
    id,
    queueName,
    data,
    status: 'waiting',
    result: null,
    error: null,
    createdAt: Date.now(),
    startedAt: null,
    completedAt: null,
  }
  inProcessStore[id] = record
  saveJobsToDisk(inProcessStore)

  // Process asynchronously
  setImmediate(async () => {
    const handler = inProcessHandlers.get(queueName)
    record.status = 'active'
    record.startedAt = Date.now()

    try {
      if (handler) {
        record.result = await handler(data)
      } else {
        record.result = { skipped: true, reason: `No processor registered for queue "${queueName}"` }
      }
      record.status = 'completed'
    } catch (err) {
      record.error = err instanceof Error ? err.message : String(err)
      record.status = 'failed'
    }

    record.completedAt = Date.now()
    inProcessStore[id] = record
    saveJobsToDisk(inProcessStore)
  })

  return { id, queueName }
}

/**
 * Get job status by id and queue name.
 * @param {string} queueName
 * @param {string} id
 * @returns {Promise<object|null>}
 */
export async function getJob(queueName, id) {
  if (USE_BULLMQ) {
    const q = getBullQueue(queueName)
    const job = await q.getJob(id)
    if (!job) return null
    const state = await job.getState()
    return {
      id: String(job.id),
      queueName,
      status: state,
      data: job.data,
      result: job.returnvalue,
      error: job.failedReason,
      createdAt: job.timestamp,
      completedAt: job.finishedOn,
    }
  }

  // In-process
  const record = inProcessStore[id]
  if (!record || record.queueName !== queueName) return null
  return { ...record }
}

/**
 * Returns true if the queue system is using Redis/BullMQ.
 */
export function isRedisMode() {
  return USE_BULLMQ
}

// ─── Log startup mode ─────────────────────────────────────────────────────────
console.log(`📋 Job queue mode: ${USE_BULLMQ ? 'BullMQ (Redis)' : 'In-process fallback'}`)
