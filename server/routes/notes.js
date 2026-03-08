/**
 * server/routes/notes.js
 *
 * POST /api/notes/upload  — teacher uploads notes (text, PDF, or image; async indexing)
 * GET  /api/notes/list    — list notes for class+subject
 */

import { Router } from 'express'
import fs from 'fs'
import path from 'path'
import multer from 'multer'
import { requireAuth } from '../middleware/requireAuth.js'
import { ensureRole } from '../middleware/rbac.js'
import { asyncRoute } from '../middleware/validate.js'
import { addJob } from '../jobQueue.js'
import { getLLMService } from '../services/llmService.js'
import { run as dbRun, all as dbAll, get as dbGet } from '../database.js'

const router = Router()
const storageDir = path.join(process.cwd(), 'server', 'storage')
const notesDir   = path.join(storageDir, 'notes')
const uploadsDir = path.join(storageDir, 'uploads')

function ensureDirs() {
  if (!fs.existsSync(notesDir)) fs.mkdirSync(notesDir, { recursive: true })
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true })
}

// Multer config: 100MB limit, accept specific file types
const ALLOWED_MIMES = [
  'text/plain', 'text/markdown',
  'application/pdf',
  'image/jpeg', 'image/png',
]

const upload = multer({
  dest: uploadsDir,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIMES.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}. Accepted: PDF, JPEG, PNG, TXT, MD`))
    }
  },
})

/**
 * Sanitize a user-supplied path segment to prevent directory traversal.
 */
function safeSeg(seg) {
  const s = path.basename(String(seg || '')).replace(/[^a-zA-Z0-9_\-\.]/g, '')
  return s.length > 0 ? s : null
}

/**
 * Verify a resolved path is strictly inside a trusted base directory.
 */
function insideBase(resolvedPath, base) {
  return resolvedPath.startsWith(base + path.sep) || resolvedPath === base
}

/**
 * Extract text from an uploaded file based on its MIME type.
 */
async function extractTextFromFile(filePath, mimeType) {
  if (mimeType === 'text/plain' || mimeType === 'text/markdown') {
    return fs.readFileSync(filePath, 'utf8')
  }

  if (mimeType === 'application/pdf') {
    const pdfParse = (await import('pdf-parse')).default
    const buffer = fs.readFileSync(filePath)
    const data = await pdfParse(buffer)
    return data.text || ''
  }

  if (mimeType === 'image/jpeg' || mimeType === 'image/png') {
    const llm = getLLMService()
    if (!llm) throw new Error('LLM service not available for OCR')
    const buffer = fs.readFileSync(filePath)
    return llm.extractTextFromImage(buffer, mimeType)
  }

  throw new Error(`Cannot extract text from ${mimeType}`)
}

// ── Upload notes (teacher/admin only) ─────────────────────────────────────────
router.post('/upload', requireAuth, ensureRole('teacher'), upload.single('file'), asyncRoute(async (req, res) => {
  const classId = req.body?.classId
  const subjectId = req.body?.subjectId
  const content = req.body?.content
  const file = req.file

  if (!subjectId || !classId) {
    return res.status(400).json({ error: 'classId and subjectId are required' })
  }
  if (!content && !file) {
    return res.status(400).json({ error: 'Either content or file is required' })
  }

  const safeClassId   = safeSeg(classId)
  const safeSubjectId = safeSeg(subjectId)
  if (!safeClassId || !safeSubjectId) {
    return res.status(400).json({ error: 'Invalid classId or subjectId' })
  }

  ensureDirs()
  const dir = path.resolve(notesDir, safeClassId, safeSubjectId)
  if (!insideBase(dir, path.resolve(notesDir))) {
    return res.status(400).json({ error: 'Invalid path' })
  }
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

  let extractedText = ''
  let ext = '.txt'

  if (file) {
    // Determine extension from mime type
    const extMap = {
      'application/pdf': '.pdf',
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'text/plain': '.txt',
      'text/markdown': '.md',
    }
    ext = extMap[file.mimetype] || '.bin'

    try {
      extractedText = await extractTextFromFile(file.path, file.mimetype)
    } catch (err) {
      // Clean up temp file on extraction failure
      try { fs.unlinkSync(file.path) } catch {}
      return res.status(422).json({ error: `Text extraction failed: ${err.message}` })
    }

    // Move file to permanent location
    const fileName = `${Date.now()}${ext}`
    const filePath = path.join(dir, fileName)
    fs.renameSync(file.path, filePath)

    const urlPath = `/storage/notes/${encodeURIComponent(safeClassId)}/${encodeURIComponent(safeSubjectId)}/${fileName}`

    // Index extracted text
    addJob('embedding-index', {
      id: `doc-${safeClassId}-${safeSubjectId}-${Date.now()}`,
      classId: safeClassId,
      subjectId: safeSubjectId,
      title: fileName,
      text: extractedText.slice(0, 50000),
    }).catch(err => console.error('Embedding index job failed:', err.message))

    return res.json({ ok: true, url: urlPath, extractedText })
  }

  // JSON content path (backward compat)
  if (!content) {
    return res.status(400).json({ error: 'content is required when no file is uploaded' })
  }

  const fileName = `${Date.now()}.txt`
  const filePath = path.join(dir, fileName)
  fs.writeFileSync(filePath, String(content), 'utf8')
  const urlPath = `/storage/notes/${encodeURIComponent(safeClassId)}/${encodeURIComponent(safeSubjectId)}/${fileName}`

  addJob('embedding-index', {
    id: `doc-${safeClassId}-${safeSubjectId}-${Date.now()}`,
    classId: safeClassId,
    subjectId: safeSubjectId,
    title: fileName,
    text: String(content).slice(0, 50000),
  }).catch(err => console.error('Embedding index job failed:', err.message))

  return res.json({ ok: true, url: urlPath, extractedText: String(content) })
}))

// ── List notes (teacher/admin only) ──────────────────────────────────────────
router.get('/list', requireAuth, ensureRole('teacher'), asyncRoute(async (req, res) => {
  const safeClassId   = safeSeg(req.query.classId)
  const safeSubjectId = safeSeg(req.query.subjectId)
  if (!safeClassId || !safeSubjectId) {
    return res.status(400).json({ error: 'classId and subjectId are required' })
  }
  const dir = path.resolve(notesDir, safeClassId, safeSubjectId)
  if (!insideBase(dir, path.resolve(notesDir))) {
    return res.status(400).json({ error: 'Invalid path' })
  }
  if (!fs.existsSync(dir)) return res.json([])
  const SUPPORTED_EXTS = ['.txt', '.md', '.pdf', '.jpg', '.jpeg', '.png']
  const files = fs.readdirSync(dir).filter(f => SUPPORTED_EXTS.some(ext => f.endsWith(ext)))
  return res.json(files.map(f => ({
    url:  `/storage/notes/${encodeURIComponent(safeClassId)}/${encodeURIComponent(safeSubjectId)}/${f}`,
    name: f,
  })))
}))

// ── Centralized unit-wise notes ──────────────────────────────────────────────

// POST /centralized — teacher uploads unit-wise notes
router.post('/centralized', requireAuth, ensureRole('teacher', 'admin'), asyncRoute(async (req, res) => {
  const { classId, subjectId, unitNumber, unitName, title, content, noteType } = req.body || {}
  if (!subjectId || unitNumber == null || !unitName || !title) {
    return res.status(400).json({ error: 'subjectId, unitNumber, unitName, and title are required' })
  }
  const validTypes = ['class_notes', 'quiz_notes']
  const type = validTypes.includes(noteType) ? noteType : 'class_notes'
  const id = `cn_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  await dbRun(
    `INSERT INTO centralized_notes (id, classId, subjectId, unitNumber, unitName, title, content, noteType, teacherId, createdAt)
     VALUES (?,?,?,?,?,?,?,?,?,?)`,
    [id, classId || null, subjectId, Number(unitNumber), unitName, title, content || '', type, req.user.id, Date.now()]
  )
  return res.json({ ok: true, id })
}))

// GET /centralized — list notes by subject+unit (any authenticated user)
router.get('/centralized', requireAuth, asyncRoute(async (req, res) => {
  const { subjectId, unitNumber, classId } = req.query
  if (!subjectId) return res.status(400).json({ error: 'subjectId is required' })

  let sql = `SELECT * FROM centralized_notes WHERE subjectId = ?`
  const params = [subjectId]

  if (unitNumber != null && unitNumber !== '') {
    sql += ` AND unitNumber = ?`
    params.push(Number(unitNumber))
  }
  if (classId) {
    sql += ` AND (classId = ? OR classId IS NULL)`
    params.push(classId)
  }
  sql += ` ORDER BY unitNumber ASC, createdAt DESC`

  const rows = await dbAll(sql, params)
  return res.json(rows)
}))

// GET /centralized/combined — all notes for a subject grouped by unit
router.get('/centralized/combined', requireAuth, asyncRoute(async (req, res) => {
  const { subjectId, classId } = req.query
  if (!subjectId) return res.status(400).json({ error: 'subjectId is required' })

  let sql = `SELECT * FROM centralized_notes WHERE subjectId = ?`
  const params = [subjectId]
  if (classId) {
    sql += ` AND (classId = ? OR classId IS NULL)`
    params.push(classId)
  }
  sql += ` ORDER BY unitNumber ASC, createdAt DESC`

  const rows = await dbAll(sql, params)

  // Group by unit
  const units = {}
  for (const row of rows) {
    const key = row.unitNumber
    if (!units[key]) {
      units[key] = { unitNumber: row.unitNumber, unitName: row.unitName, notes: [] }
    }
    units[key].notes.push(row)
  }

  return res.json(Object.values(units))
}))

export default router
