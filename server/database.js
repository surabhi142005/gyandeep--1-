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

export const initDB = () => {
    ensureDataDir()
    return new Promise((resolve, reject) => {
        db = new sqlite3.Database(dbPath, (err) => {
            if (err) return reject(err)
            console.log('Connected to SQLite database.')
            resolve(db)
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

export const setupSchema = async () => {
    try {
        // Users Table
        await run(`CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            name TEXT,
            email TEXT,
            role TEXT,
            password TEXT,
            googleId TEXT,
            faceImage TEXT,
            preferences TEXT, 
            history TEXT,
            assignedSubjects TEXT,
            performance TEXT,
            classId TEXT
        )`)
        console.log('✓ Users table ready')

        // OTP Table
        await run(`CREATE TABLE IF NOT EXISTS otp (
            userId TEXT,
            code TEXT,
            expires INTEGER
        )`)
        console.log('✓ OTP table ready')

        // Audit Log Table
        await run(`CREATE TABLE IF NOT EXISTS audit_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ts INTEGER,
            type TEXT,
            userId TEXT,
            details TEXT
        )`)
        console.log('✓ Audit logs table ready')

        // Classes Table
        await run(`CREATE TABLE IF NOT EXISTS classes (
            id TEXT PRIMARY KEY,
            name TEXT
        )`)
        console.log('✓ Classes table ready')

        // Question Bank Table
        await run(`CREATE TABLE IF NOT EXISTS question_bank (
            id TEXT PRIMARY KEY,
            question TEXT,
            options TEXT,
            correctAnswer TEXT,
            tags TEXT,
            difficulty TEXT,
            subject TEXT
        )`)
        console.log('✓ Question bank table ready')

        // Tags Presets Table
        await run(`CREATE TABLE IF NOT EXISTS tags_presets (
            subject TEXT PRIMARY KEY,
            tags TEXT
        )`)
        console.log('✓ Tags presets table ready')

        // Teacher Insights Table (populated by weekly cron)
        await run(`CREATE TABLE IF NOT EXISTS teacher_insights (
            teacher_id TEXT NOT NULL,
            insight_text TEXT NOT NULL,
            generated_at TEXT NOT NULL,
            PRIMARY KEY (teacher_id, DATE(generated_at))
        )`)
        console.log('✓ Teacher insights table ready')

        // Attendance Table
        await run(`CREATE TABLE IF NOT EXISTS attendance (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT,
            student_id TEXT,
            status TEXT DEFAULT 'present',
            verified_at TEXT
        )`)
        console.log('✓ Attendance table ready')

        console.log('Database schema synced.')
    } catch (err) {
        console.error('Error setting up schema:', err)
    }
}
