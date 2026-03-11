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
import { mongoOps, COLLECTIONS, generateId, getDB } from '../db/mongo.js'
import { ALLOWED_MIMES } from '@/dist/assets/TeacherDashboard-BTL1tLM-.js'

const router = Router()
const storageDir = path.join(process.cwd(), 'server', 'storage')
const notesDir   = path.join(storageDir, 'notes')
const uploadsDir = path.join(storageDir, 'uploads')

function ensureDirs() {
  if (!fs.existsSync(notesDir)) fs.mkdirSync(notesDir, { recursive: true })
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true })
}

const upload = multer({
  dest: uploadsDir,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIMES.includes(file.mimetype)) {
      // For octet-stream, only allow known extensions
      if (file.mimetype === 'application/octet-stream') {
        const ext = path.extname(file.originalname).toLowerCase()
        if (['.pdf', '.doc', '.docx'].includes(ext)) {
          cb(null, true)
        } else {
          cb(new Error(`Unsupported file type. Accepted: PDF, DOCX, DOC, JPEG, PNG, TXT, MD`))
        }
      } else {
        cb(null, true)
      }
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}. Accepted: PDF, DOCX, DOC, JPEG, PNG, TXT, MD`))
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

  // Handle all PDF MIME variants + octet-stream with .pdf extension
  const isPdf = ['application/pdf', 'application/x-pdf', 'application/vnd.pdf'].includes(mimeType) ||
    (mimeType === 'application/octet-stream' && path.extname(filePath).toLowerCase() === '.pdf')
  if (isPdf) {
    const pdfParse = (await import('pdf-parse')).default
    const buffer = fs.readFileSync(filePath)
    const data = await pdfParse(buffer)
    return data.text || ''
  }

  // Handle .docx files
  const isDocx = mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    (mimeType === 'application/octet-stream' && path.extname(filePath).toLowerCase() === '.docx')
  if (isDocx) {
    try {
      const mammoth = (await import('mammoth')).default || await import('mammoth')
      const result = await mammoth.extractRawText({ path: filePath })
      return result.value || ''
    } catch {
      // Fallback: try reading as binary text
      throw new Error('DOCX extraction requires the mammoth package. Install it with: npm i mammoth')
    }
  }

  // Handle .doc files (legacy Word format)
  if (mimeType === 'application/msword' ||
    (mimeType === 'application/octet-stream' && path.extname(filePath).toLowerCase() === '.doc')) {
    throw new Error('Legacy .doc format is not fully supported. Please convert to .docx or .pdf.')
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
router.post('/upload', requireAuth, ensureRole('teacher', 'admin'), upload.single('file'), asyncRoute(async (req, res) => {
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
      'application/x-pdf': '.pdf',
      'application/vnd.pdf': '.pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
      'application/msword': '.doc',
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'text/plain': '.txt',
      'text/markdown': '.md',
    }
    // For octet-stream, use original file extension
    if (file.mimetype === 'application/octet-stream') {
      ext = path.extname(file.originalname).toLowerCase() || '.bin'
    } else {
      ext = extMap[file.mimetype] || '.bin'
    }

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
router.get('/list', requireAuth, ensureRole('teacher', 'admin'), asyncRoute(async (req, res) => {
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
  const SUPPORTED_EXTS = ['.txt', '.md', '.pdf', '.jpg', '.jpeg', '.png', '.docx', '.doc']
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
  const doc = {
    _id: generateId(),
    classId: classId || null,
    subjectId,
    unitNumber: Number(unitNumber),
    unitName,
    title,
    content: content || '',
    noteType: type,
    teacherId: req.user.id,
    sessionId: req.body?.sessionId || null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
  await mongoOps.insertOne(COLLECTIONS.CENTRALIZED_NOTES, doc)
  return res.json({ ok: true, id: doc._id })
}))

// GET /centralized — list notes by subject+unit (any authenticated user)
router.get('/centralized', requireAuth, asyncRoute(async (req, res) => {
  const { subjectId, unitNumber, classId } = req.query
  if (!subjectId) return res.status(400).json({ error: 'subjectId is required' })

  const query = { subjectId }
  if (unitNumber != null && unitNumber !== '') {
    query.unitNumber = Number(unitNumber)
  }
  if (classId) {
    query.$or = [{ classId }, { classId: null }]
  }

  const rows = await getDB()
    .collection(COLLECTIONS.CENTRALIZED_NOTES)
    .find(query)
    .sort({ unitNumber: 1, createdAt: -1 })
    .toArray()

  return res.json(rows.map(r => ({ ...r, id: r._id?.toString?.() || r.id })))
}))

// GET /centralized/combined — all notes for a subject grouped by unit
router.get('/centralized/combined', requireAuth, asyncRoute(async (req, res) => {
  const { subjectId, classId } = req.query
  if (!subjectId) return res.status(400).json({ error: 'subjectId is required' })

  const query = { subjectId }
  if (classId) {
    query.$or = [{ classId }, { classId: null }]
  }

  const rows = await getDB()
    .collection(COLLECTIONS.CENTRALIZED_NOTES)
    .find(query)
    .sort({ unitNumber: 1, createdAt: -1 })
    .toArray()

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
