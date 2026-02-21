import fs from 'fs'
import path from 'path'
import { initDB, setupSchema, run as dbRun } from './database.js'

const dataDir = path.join(process.cwd(), 'server', 'data')
const usersFile = path.join(dataDir, 'users.json')

async function migrate() {
  try {
    await initDB()
    await setupSchema()
    if (!fs.existsSync(usersFile)) {
      console.log('No users.json found; nothing to migrate.')
      process.exit(0)
    }
    const raw = fs.readFileSync(usersFile, 'utf8')
    const users = JSON.parse(raw || '[]')
    if (!Array.isArray(users) || users.length === 0) {
      console.log('No users to migrate.')
      process.exit(0)
    }
    console.log(`Migrating ${users.length} users to SQLite DB...`)
    await dbRun(`DELETE FROM users`)
    for (const u of users) {
      await dbRun(`INSERT OR REPLACE INTO users (id, name, email, role, password, googleId, faceImage, preferences, history, assignedSubjects, performance, classId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
        u.id,
        u.name || null,
        u.email || null,
        u.role || null,
        u.password || u.passwordHash || null,
        u.googleId || null,
        u.faceImage || null,
        JSON.stringify(u.preferences || {}),
        JSON.stringify(u.history || []),
        JSON.stringify(u.assignedSubjects || []),
        JSON.stringify(u.performance || []),
        u.classId || null
      ])
    }
    console.log('Migration complete.')
    process.exit(0)
  } catch (err) {
    console.error('Migration failed:', err)
    process.exit(2)
  }
}

migrate()
