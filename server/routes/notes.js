/**
 * server/routes/notes.js
 *
 * POST /api/notes/upload  — teacher uploads notes (async indexing)
 * GET  /api/notes/list    — list notes for class+subject
 */

import { Router } from 'express'
import fs from 'fs'
import path from 'path'
import { requireAuth } from '../middleware/requireAuth.js'
import { ensureRole } from '../middleware/rbac.js'
import { asyncRoute } from '../middleware/validate.js'
import { addJob } from '../jobQueue.js'

const router = Router()
const storageDir = path.join(process.cwd(), 'server', 'storage')
const notesDir   = path.join(storageDir, 'notes')

function ensureDirs() {
  if (!fs.existsSync(notesDir)) fs.mkdirSync(notesDir, { recursive: true })
}

/**
 * Sanitize a user-supplied path segment to prevent directory traversal.
 * Strips everything except alphanumeric, hyphen, underscore, and dot.
 * Returns null if the result is empty (invalid input).
 */
function safeSeg(seg) {
  const s = path.basename(String(seg || '')).replace(/[^a-zA-Z0-9_\-\.]/g, '')
  return s.length > 0 ? s : null
}

/**
 * Verify a resolved path is strictly inside a trusted base directory.
 * Guards against symlink attacks and edge cases path.basename misses.
 */
function insideBase(resolvedPath, base) {
  return resolvedPath.startsWith(base + path.sep) || resolvedPath === base
}

// ── Upload notes (teacher/admin only) ─────────────────────────────────────────
// Notes are saved to disk, then an async job indexes them for RAG search.
router.post('/upload', requireAuth, ensureRole('teacher', 'admin'), asyncRoute(async (req, res) => {
  const { classId, subjectId, content } = req.body || {}
  if (!content || !subjectId || !classId) {
    return res.status(400).json({ error: 'classId, subjectId, and content are required' })
  }

  // Sanitize path segments — prevents directory traversal attacks
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

  const fileName = `${Date.now()}.txt`
  const filePath = path.join(dir, fileName)
  fs.writeFileSync(filePath, String(content), 'utf8')
  const urlPath = `/storage/notes/${encodeURIComponent(safeClassId)}/${encodeURIComponent(safeSubjectId)}/${fileName}`

  // Fire-and-forget: index notes for RAG search asynchronously
  addJob('embedding-index', {
    id: `doc-${safeClassId}-${safeSubjectId}-${Date.now()}`,
    classId: safeClassId,
    subjectId: safeSubjectId,
    title: fileName,
    text: String(content).slice(0, 50000),
  }).catch(err => console.error('Embedding index job failed:', err.message))

  return res.json({ ok: true, url: urlPath })
}))

// ── List notes (teacher/admin only) ──────────────────────────────────────────
// Restricted to teacher/admin: any authenticated student could otherwise
// enumerate notes filenames for arbitrary class/subject combinations.
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
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.txt'))
  return res.json(files.map(f => ({
    url:  `/storage/notes/${encodeURIComponent(safeClassId)}/${encodeURIComponent(safeSubjectId)}/${f}`,
    name: f,
  })))
}))

export default router
