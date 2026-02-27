import sqlite3 from 'sqlite3'
import path from 'path'
import fs from 'fs'

const dbPath = path.join(process.cwd(), 'server', 'data', 'gyandeep.db')
const dataDir = path.join(process.cwd(), 'server', 'data')

const ensureDataDir = () => {
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true })
    }
}

let db
let transactionTail = Promise.resolve()

export const initDB = () => {
    ensureDataDir()
    return new Promise((resolve, reject) => {
        db = new sqlite3.Database(dbPath, (err) => {
            if (err) return reject(err)
            // Enable WAL mode for better concurrent read/write performance
            db.run('PRAGMA journal_mode = WAL', () => {
                // Enforce foreign key constraints on every connection
                db.run('PRAGMA foreign_keys = ON', () => {
                    console.log('Connected to SQLite database (WAL mode, FK enforcement ON).')
                    resolve(db)
                })
            })
        })
    })
}

export const getDB = () => {
    if (!db) throw new Error('Database not initialized')
    return db
}

export const run = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        getDB().run(sql, params, function (err) {
            if (err) return reject(err)
            resolve({ id: this.lastID, changes: this.changes })
        })
    })
}

export const get = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        getDB().get(sql, params, (err, row) => {
            if (err) return reject(err)
            resolve(row)
        })
    })
}

export const all = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        getDB().all(sql, params, (err, rows) => {
            if (err) return reject(err)
            resolve(rows)
        })
    })
}

/**
 * Serialize transactional work so statements from parallel requests cannot
 * interleave inside a BEGIN/COMMIT block on the shared sqlite connection.
 */
export const runInTransaction = async (work) => {
    const prev = transactionTail
    let release
    transactionTail = new Promise(resolve => { release = resolve })

    await prev
    try {
        await run('BEGIN IMMEDIATE')
        const result = await work({ run, get, all })
        await run('COMMIT')
        return result
    } catch (err) {
        try { await run('ROLLBACK') } catch {}
        throw err
    } finally {
        release()
    }
}

export const setupSchema = async () => {
    try {
        // Enable foreign key enforcement
        await run(`PRAGMA foreign_keys = ON`)

        // Users Table
        await run(`CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            name TEXT,
            email TEXT UNIQUE,
            role TEXT NOT NULL DEFAULT 'student',
            password TEXT,
            googleId TEXT,
            faceImage TEXT,
            emailVerified INTEGER NOT NULL DEFAULT 0,
            preferences TEXT,
            history TEXT,
            assignedSubjects TEXT,
            performance TEXT,
            classId TEXT
        )`)
        // Add emailVerified to existing DBs that predate this column
        try { await run(`ALTER TABLE users ADD COLUMN emailVerified INTEGER NOT NULL DEFAULT 0`) } catch {}
        await run(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`)
        await run(`CREATE INDEX IF NOT EXISTS idx_users_role  ON users(role)`)
        console.log('Users table ready')

        // OTP Table
        await run(`CREATE TABLE IF NOT EXISTS otp (
            userId TEXT NOT NULL,
            code TEXT NOT NULL,
            expires INTEGER NOT NULL,
            PRIMARY KEY (userId)
        )`)
        await run(`CREATE INDEX IF NOT EXISTS idx_otp_userId ON otp(userId)`)
        console.log('OTP table ready')

        // Audit Log Table
        await run(`CREATE TABLE IF NOT EXISTS audit_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ts INTEGER NOT NULL,
            type TEXT NOT NULL,
            userId TEXT,
            details TEXT
        )`)
        await run(`CREATE INDEX IF NOT EXISTS idx_audit_userId_ts ON audit_logs(userId, ts)`)
        console.log('Audit logs table ready')

        // Classes Table
        await run(`CREATE TABLE IF NOT EXISTS classes (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL
        )`)
        console.log('Classes table ready')

        // Question Bank Table
        await run(`CREATE TABLE IF NOT EXISTS question_bank (
            id TEXT PRIMARY KEY,
            question TEXT NOT NULL,
            options TEXT,
            correctAnswer TEXT,
            tags TEXT,
            difficulty TEXT,
            subject TEXT
        )`)
        await run(`CREATE INDEX IF NOT EXISTS idx_qb_subject_diff ON question_bank(subject, difficulty)`)
        console.log('Question bank table ready')

        // Tags Presets Table
        await run(`CREATE TABLE IF NOT EXISTS tags_presets (
            subject TEXT PRIMARY KEY,
            tags TEXT
        )`)
        console.log('Tags presets table ready')

        // Teacher Insights Table (populated by weekly cron)
        await run(`CREATE TABLE IF NOT EXISTS teacher_insights (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            teacher_id TEXT NOT NULL,
            insight_text TEXT NOT NULL,
            generated_at TEXT NOT NULL
        )`)
        await run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_ti_teacher_date ON teacher_insights(teacher_id, DATE(generated_at))`)
        console.log('Teacher insights table ready')

        // Attendance Table - unique constraint prevents duplicate marks per session/student
        await run(`CREATE TABLE IF NOT EXISTS attendance (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT NOT NULL,
            student_id TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'present',
            verified_at TEXT
        )`)
        await run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_attendance_session_student ON attendance(session_id, student_id)`)
        await run(`CREATE INDEX IF NOT EXISTS idx_attendance_session ON attendance(session_id)`)
        console.log('Attendance table ready')

        // Grades Table - replaces grades.json to prevent concurrent write data loss
        await run(`CREATE TABLE IF NOT EXISTS grades (
            id TEXT PRIMARY KEY,
            studentId TEXT NOT NULL,
            subject TEXT NOT NULL,
            category TEXT NOT NULL,
            title TEXT NOT NULL,
            score REAL NOT NULL,
            maxScore REAL NOT NULL,
            weight REAL NOT NULL DEFAULT 1,
            date TEXT NOT NULL,
            teacherId TEXT,
            createdAt INTEGER NOT NULL
        )`)
        await run(`CREATE INDEX IF NOT EXISTS idx_grades_student ON grades(studentId)`)
        await run(`CREATE INDEX IF NOT EXISTS idx_grades_teacher ON grades(teacherId)`)
        await run(`CREATE INDEX IF NOT EXISTS idx_grades_subject ON grades(subject)`)
        console.log('Grades table ready')

        // Timetable Table - DB-backed to avoid JSON read-modify-write races
        await run(`CREATE TABLE IF NOT EXISTS timetable_entries (
            id TEXT PRIMARY KEY,
            day TEXT NOT NULL,
            startTime TEXT NOT NULL,
            endTime TEXT NOT NULL,
            subject TEXT NOT NULL,
            teacherId TEXT,
            classId TEXT,
            room TEXT,
            createdAt INTEGER NOT NULL,
            updatedAt INTEGER NOT NULL
        )`)
        await run(`CREATE INDEX IF NOT EXISTS idx_timetable_day_start ON timetable_entries(day, startTime)`)
        await run(`CREATE INDEX IF NOT EXISTS idx_timetable_teacher ON timetable_entries(teacherId)`)
        await run(`CREATE INDEX IF NOT EXISTS idx_timetable_class ON timetable_entries(classId)`)
        console.log('Timetable table ready')

        // Helpdesk tickets
        await run(`CREATE TABLE IF NOT EXISTS tickets (
            id TEXT PRIMARY KEY,
            userId TEXT NOT NULL,
            userName TEXT,
            subject TEXT NOT NULL,
            message TEXT NOT NULL,
            category TEXT NOT NULL DEFAULT 'general',
            status TEXT NOT NULL DEFAULT 'open',
            createdAt INTEGER NOT NULL,
            updatedAt INTEGER NOT NULL,
            version INTEGER NOT NULL DEFAULT 1
        )`)
        await run(`CREATE INDEX IF NOT EXISTS idx_tickets_user ON tickets(userId)`)
        await run(`CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status)`)
        await run(`CREATE TABLE IF NOT EXISTS ticket_replies (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ticketId TEXT NOT NULL,
            userId TEXT NOT NULL,
            userName TEXT,
            message TEXT NOT NULL,
            createdAt INTEGER NOT NULL,
            FOREIGN KEY(ticketId) REFERENCES tickets(id) ON DELETE CASCADE
        )`)
        await run(`CREATE INDEX IF NOT EXISTS idx_ticket_replies_ticket ON ticket_replies(ticketId, createdAt)`)
        console.log('Tickets tables ready')

        // Idempotency keys for safe client retries
        await run(`CREATE TABLE IF NOT EXISTS idempotency_keys (
            key TEXT NOT NULL,
            userId TEXT NOT NULL,
            action TEXT NOT NULL,
            statusCode INTEGER NOT NULL,
            responseBody TEXT NOT NULL,
            createdAt INTEGER NOT NULL,
            PRIMARY KEY (key, userId, action)
        )`)
        await run(`CREATE INDEX IF NOT EXISTS idx_idempotency_created_at ON idempotency_keys(createdAt)`)
        await run(`DELETE FROM idempotency_keys WHERE createdAt < ?`, [Date.now() - 7 * 24 * 60 * 60 * 1000])
        console.log('Idempotency table ready')

        console.log('Database schema synced.')
    } catch (err) {
        console.error('Error setting up schema:', err)
    }
}
