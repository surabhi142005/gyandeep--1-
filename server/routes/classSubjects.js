import { Router } from 'express'
import { requireAuth } from '../middleware/requireAuth.js'
import { ensureRole } from '../middleware/rbac.js'
import { asyncRoute } from '../middleware/validate.js'
import { mongoOps, COLLECTIONS, generateId } from '../db/mongo.js'

const router = Router()

// List class-subject mappings
router.get('/', requireAuth, ensureRole('admin', 'teacher'), asyncRoute(async (req, res) => {
  const { classId, subjectId } = req.query
  const filter = {}
  if (classId) filter.classId = classId
  if (subjectId) filter.subjectId = subjectId

  const rows = await mongoOps.find(COLLECTIONS.CLASS_SUBJECTS, filter, { sort: { createdAt: -1 } }).catch(() => [])
  return res.json(rows.map(r => ({ ...r, id: r._id?.toString?.() || r.id })))
}))

// Create mapping
router.post('/', requireAuth, ensureRole('admin', 'teacher'), asyncRoute(async (req, res) => {
  const { classId, subjectId, primaryTeacherId, semester } = req.body || {}
  if (!classId || !subjectId) return res.status(400).json({ error: 'classId and subjectId required' })

  const doc = {
    _id: generateId(),
    classId,
    subjectId,
    primaryTeacherId: primaryTeacherId || null,
    semester: semester || null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  await mongoOps.insertOne(COLLECTIONS.CLASS_SUBJECTS, doc)
  return res.json({ ok: true, id: doc._id })
}))

// Update mapping
router.patch('/:id', requireAuth, ensureRole('admin', 'teacher'), asyncRoute(async (req, res) => {
  const updates = {}
  if (req.body?.primaryTeacherId !== undefined) updates.primaryTeacherId = req.body.primaryTeacherId
  if (req.body?.semester !== undefined) updates.semester = req.body.semester
  if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'No updates provided' })
  updates.updatedAt = new Date()

  const result = await mongoOps.updateOne(COLLECTIONS.CLASS_SUBJECTS, { _id: req.params.id }, { $set: updates })
  return res.json({ ok: result?.modifiedCount !== 0 })
}))

// Delete mapping
router.delete('/:id', requireAuth, ensureRole('admin', 'teacher'), asyncRoute(async (req, res) => {
  await mongoOps.deleteOne(COLLECTIONS.CLASS_SUBJECTS, { _id: req.params.id })
  return res.json({ ok: true })
}))

export default router
