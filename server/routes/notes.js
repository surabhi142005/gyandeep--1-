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

// ── Upload notes (teacher/admin only) ─────────────────────────────────────────
// Notes are saved to disk, then an async job indexes them for RAG search.
router.post('/upload', requireAuth, ensureRole('teacher', 'admin'), asyncRoute(async (req, res) => {
  const { classId, subjectId, content } = req.body || {}
  if (!content || !subjectId || !classId) {
    return res.status(400).json({ error: 'classId, subjectId, and content are required' })
  }
  ensureDirs()
  const dir = path.join(notesDir, String(classId), String(subjectId))
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  const fileName = `${Date.now()}.txt`
  const filePath = path.join(dir, fileName)
  fs.writeFileSync(filePath, String(content), 'utf8')
  const urlPath = `/storage/notes/${encodeURIComponent(classId)}/${encodeURIComponent(subjectId)}/${fileName}`

  // Fire-and-forget: index notes for RAG search asynchronously
  addJob('embedding-index', {
    id: `doc-${classId}-${subjectId}-${Date.now()}`,
    classId: String(classId),
    subjectId: String(subjectId),
    title: fileName,
    text: String(content).slice(0, 50000),
  }).catch(err => console.error('Embedding index job failed:', err.message))

  return res.json({ ok: true, url: urlPath })
}))

// ── List notes ────────────────────────────────────────────────────────────────
router.get('/list', requireAuth, asyncRoute(async (req, res) => {
  const classId   = String(req.query.classId || '')
  const subjectId = String(req.query.subjectId || '')
  if (!classId || !subjectId) return res.status(400).json({ error: 'classId and subjectId are required' })
  const dir = path.join(notesDir, classId, subjectId)
  if (!fs.existsSync(dir)) return res.json([])
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.txt'))
  return res.json(files.map(f => ({
    url:  `/storage/notes/${encodeURIComponent(classId)}/${encodeURIComponent(subjectId)}/${f}`,
    name: f,
  })))
}))

export default router
