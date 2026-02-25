/**
 * server/db/pg.js — PostgreSQL connection pool
 *
 * Uses the `pg` library with a pool so every request can reuse connections.
 * Falls back gracefully when DATABASE_URL is not configured (SQLite mode).
 *
 * Usage:
 *   import { query, getClient } from './db/pg.js'
 *   const rows = await query('SELECT * FROM users WHERE id = $1', [id])
 */

import pg from 'pg'
import dotenv from 'dotenv'

dotenv.config({ path: '../.env.local' })
dotenv.config()

const { Pool } = pg

let pool = null
let pgAvailable = false

if (process.env.DATABASE_URL) {
  try {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL.includes('localhost')
        ? false
        : { rejectUnauthorized: false },
      max: 20,                     // max pool connections
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    })

    // Test the connection eagerly
    const client = await pool.connect()
    await client.query('SELECT 1')
    client.release()
    pgAvailable = true
    console.log('✅ PostgreSQL pool connected')
  } catch (err) {
    console.warn('⚠️  PostgreSQL unavailable, falling back to SQLite:', err.message)
    pool = null
  }
} else {
  console.info('ℹ️  DATABASE_URL not set — PostgreSQL disabled, using SQLite fallback')
}

/**
 * Execute a parameterised query.
 * Throws if PostgreSQL is not available.
 */
export async function query(sql, params = []) {
  if (!pool) throw new Error('PostgreSQL not configured')
  return pool.query(sql, params)
}

/**
 * Get a raw client for transactions.
 * Remember to call client.release() after use.
 */
export async function getClient() {
  if (!pool) throw new Error('PostgreSQL not configured')
  return pool.connect()
}

/**
 * Run a function inside a transaction.
 * Automatically COMMITs or ROLLBACKs.
 *
 * @param {(client: pg.PoolClient) => Promise<T>} fn
 * @returns {Promise<T>}
 */
export async function withTransaction(fn) {
  const client = await getClient()
  try {
    await client.query('BEGIN')
    const result = await fn(client)
    await client.query('COMMIT')
    return result
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

export { pgAvailable }
export default pool
