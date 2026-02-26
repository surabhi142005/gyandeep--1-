/**
 * server/utils/fileStore.js — Serialized JSON file store
 *
 * Prevents data loss from concurrent request race conditions on JSON files.
 * The read-modify-write pattern used across index.js (timetable, tickets,
 * notifications, etc.) is not atomic: two simultaneous writes interleave at
 * the OS level and one overwrites the other.
 *
 * This module serializes all writes to a given file through a per-file
 * Promise chain (a simple async mutex), ensuring only one write is in
 * progress at a time.
 *
 * Usage:
 *   import { readJSON, mutateJSON } from '../utils/fileStore.js'
 *
 *   // Read (no locking needed — reads are atomic on most OSes for small files)
 *   const tickets = await readJSON(ticketsFile, [])
 *
 *   // Write (serialized)
 *   const updated = await mutateJSON(ticketsFile, [], arr => {
 *     arr.push(newTicket)
 *     return arr
 *   })
 */

import fs from 'fs'
import path from 'path'

// Per-file mutex: maps absolute file path → tail of the Promise chain
const locks = new Map()

/**
 * Read JSON from a file. Returns defaultValue if the file doesn't exist or
 * contains invalid JSON.
 */
export function readJSON(filePath, defaultValue = null) {
  try {
    if (!fs.existsSync(filePath)) return defaultValue
    const raw = fs.readFileSync(filePath, 'utf8')
    return JSON.parse(raw || JSON.stringify(defaultValue))
  } catch {
    return defaultValue
  }
}

/**
 * Atomically read-modify-write a JSON file with serialization.
 *
 * @param {string}   filePath      Absolute path to the JSON file
 * @param {*}        defaultValue  Value to use if file doesn't exist
 * @param {(current: *) => *} mutateFn  Pure function: receives current value, returns new value
 * @returns {Promise<*>}  The new value after mutation
 *
 * All calls to mutateJSON for the same filePath are queued — the next
 * mutation only starts after the previous one has written to disk.
 */
export function mutateJSON(filePath, defaultValue, mutateFn) {
  const absPath = path.resolve(filePath)

  // Chain onto the existing lock for this file, or start a new chain
  const prev = locks.get(absPath) || Promise.resolve()
  const next = prev.then(() => {
    const current = readJSON(absPath, defaultValue)
    const updated = mutateFn(current)
    const dir = path.dirname(absPath)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(absPath, JSON.stringify(updated, null, 2), 'utf8')
    return updated
  })

  // Store the new tail; clean up lock entry when chain is idle
  locks.set(absPath, next.catch(() => {}).then(() => {
    if (locks.get(absPath) === next) locks.delete(absPath)
  }))

  return next
}
