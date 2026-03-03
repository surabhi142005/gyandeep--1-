/**
 * server/seed.js — Seed the database with default users
 *
 * Usage:  cd server && node seed.js
 *
 * Creates 3 users with bcrypt-hashed passwords:
 *   admin@gyandeep.com    / Admin@123     (admin)
 *   teacher@gyandeep.com  / Teacher@123   (teacher)
 *   student@gyandeep.com  / Student@123   (student)
 */

import bcrypt from 'bcryptjs'
import { initDB, setupSchema, run, get } from './database.js'

const USERS = [
  { id: 'admin-1',   name: 'Admin User',   email: 'admin@gyandeep.com',   role: 'admin',   password: 'Admin@123' },
  { id: 'teacher-1', name: 'Teacher User',  email: 'teacher@gyandeep.com', role: 'teacher', password: 'Teacher@123' },
  { id: 'student-1', name: 'Student User',  email: 'student@gyandeep.com', role: 'student', password: 'Student@123' },
]

async function seed() {
  await initDB()
  await setupSchema()

  for (const u of USERS) {
    const existing = await get(`SELECT id FROM users WHERE LOWER(email) = ?`, [u.email.toLowerCase()])
    if (existing) {
      // Update password to ensure it's correct bcrypt hash
      const hash = await bcrypt.hash(u.password, 12)
      await run(`UPDATE users SET password = ?, name = ?, role = ? WHERE id = ?`, [hash, u.name, u.role, existing.id])
      console.log(`  Updated: ${u.email} (${u.role})`)
    } else {
      const hash = await bcrypt.hash(u.password, 12)
      await run(
        `INSERT INTO users (id, name, email, role, password, emailVerified, preferences, history, assignedSubjects, performance)
         VALUES (?,?,?,?,?,1,'{}','[]','[]','[]')`,
        [u.id, u.name, u.email, u.role, hash]
      )
      console.log(`  Created: ${u.email} (${u.role})`)
    }
  }

  console.log('\n--- Seed complete! Login credentials ---')
  console.log('  Admin:   admin@gyandeep.com    / Admin@123')
  console.log('  Teacher: teacher@gyandeep.com  / Teacher@123')
  console.log('  Student: student@gyandeep.com  / Student@123')
  console.log('')
  process.exit(0)
}

seed().catch(err => { console.error('Seed failed:', err); process.exit(1) })
