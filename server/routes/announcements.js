/**
 * server/routes/announcements.js
 *
 * Announcement system for teachers and admins to broadcast to classes
 * GET    /api/announcements          - List announcements
 * POST   /api/announcements            - Create announcement
 * PATCH  /api/announcements/:id      - Update announcement
 * DELETE /api/announcements/:id       - Delete announcement
 * GET    /api/announcements/class/:classId - List for specific class
 */

import { Router } from 'express'
import { requireAuth } from '../middleware/requireAuth.js'
import { ensureRole } from '../middleware/rbac.js'
import { asyncRoute } from '../middleware/validate.js'
import { connectToDatabase, COLLECTIONS } from '../db/mongoAtlas.js'
import { ObjectId } from 'mongodb'

const router = Router()

/**
 * GET /api/announcements
 * List announcements for the user's class (students) or all (teachers/admins)
 */
router.get('/', requireAuth, asyncRoute(async (req, res) => {
  const db = await connectToDatabase()
  const user = req.user
  const { classId, subjectId, limit = 20, page = 1 } = req.query

  let query = {}

  // Students only see announcements for their class
  if (user.role === 'student') {
    if (!user.classId) {
      return res.json({ announcements: [], pagination: { total: 0, page: 1, limit: Number(limit), pages: 0 } })
    }
    query.classId = user.classId
  } else if (user.role === 'teacher') {
    // Teachers see announcements they created or for classes they teach
    const teacherClasses = await db.collection(COLLECTIONS.CLASS_SUBJECTS)
      .find({ primaryTeacherId: user.id })
      .toArray()
    const classIds = teacherClasses.map(cs => cs.classId)
    query.$or = [
      { authorId: user.id },
      { classId: { $in: classIds } }
    ]
  }
  // Admins see all announcements

  if (classId) {
    query = { classId }
  }
  if (subjectId) {
    query.subjectId = subjectId
  }

  // Only show non-expired announcements (or include expired if specifically requested)
  if (req.query.includeExpired !== 'true') {
    query.$or = query.$or || []
    query.$or.push(
      { expiresAt: { $exists: false } },
      { expiresAt: null },
      { expiresAt: { $gt: new Date() } }
    )
  }

  const skip = (Number(page) - 1) * Number(limit)

  const [announcements, total] = await Promise.all([
    db.collection(COLLECTIONS.ANNOUNCEMENTS)
      .find(query)
      .sort({ priority: -1, createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .toArray(),
    db.collection(COLLECTIONS.ANNOUNCEMENTS).countDocuments(query)
  ])

  // Enrich with author and class info
  const authorIds = [...new Set(announcements.map(a => a.authorId))]
  const classIds = [...new Set(announcements.map(a => a.classId).filter(Boolean))]
  const subjectIds = [...new Set(announcements.map(a => a.subjectId).filter(Boolean))]

  const [authors, classes, subjects] = await Promise.all([
    db.collection(COLLECTIONS.USERS)
      .find({ _id: { $in: authorIds.map(id => new ObjectId(id)) } })
      .project({ name: 1, email: 1 })
      .toArray(),
    db.collection(COLLECTIONS.CLASSES)
      .find({ _id: { $in: classIds.map(id => new ObjectId(id)) } })
      .project({ name: 1 })
      .toArray(),
    db.collection(COLLECTIONS.SUBJECTS)
      .find({ _id: { $in: subjectIds.map(id => new ObjectId(id)) } })
      .project({ name: 1 })
      .toArray()
  ])

  const authorMap = new Map(authors.map(a => [a._id.toString(), a]))
  const classMap = new Map(classes.map(c => [c._id.toString(), c]))
  const subjectMap = new Map(subjects.map(s => [s._id.toString(), s]))

  res.json({
    announcements: announcements.map(a => ({
      ...a,
      id: a._id.toString(),
      author: authorMap.get(a.authorId) || null,
      class: classMap.get(a.classId) || null,
      subject: a.subjectId ? (subjectMap.get(a.subjectId) || null) : null
    })),
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      pages: Math.ceil(total / Number(limit))
    }
  })
}))

/**
 * GET /api/announcements/class/:classId
 * List announcements for a specific class
 */
router.get('/class/:classId', requireAuth, asyncRoute(async (req, res) => {
  const db = await connectToDatabase()
  const { classId } = req.params
  const { limit = 20, page = 1 } = req.query

  const skip = (Number(page) - 1) * Number(limit)

  const query = {
    classId,
    $or: [
      { expiresAt: { $exists: false } },
      { expiresAt: null },
      { expiresAt: { $gt: new Date() } }
    ]
  }

  const [announcements, total] = await Promise.all([
    db.collection(COLLECTIONS.ANNOUNCEMENTS)
      .find(query)
      .sort({ priority: -1, createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .toArray(),
    db.collection(COLLECTIONS.ANNOUNCEMENTS).countDocuments(query)
  ])

  res.json({
    announcements: announcements.map(a => ({
      ...a,
      id: a._id.toString()
    })),
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      pages: Math.ceil(total / Number(limit))
    }
  })
}))

/**
 * POST /api/announcements
 * Create a new announcement (teacher/admin only)
 */
router.post('/', requireAuth, ensureRole('teacher', 'admin'), asyncRoute(async (req, res) => {
  const db = await connectToDatabase()
  const user = req.user
  const { classId, subjectId, title, content, priority = 'normal', expiresAt } = req.body

  if (!classId || !title || !content) {
    return res.status(400).json({ error: 'classId, title, and content are required' })
  }

  const validPriorities = ['low', 'normal', 'high']
  if (!validPriorities.includes(priority)) {
    return res.status(400).json({ error: `Priority must be one of: ${validPriorities.join(', ')}` })
  }

  // Teachers can only announce to classes they teach
  if (user.role === 'teacher') {
    const classSubject = await db.collection(COLLECTIONS.CLASS_SUBJECTS).findOne({
      classId,
      primaryTeacherId: user.id
    })
    if (!classSubject) {
      return res.status(403).json({ error: 'You can only announce to classes you teach' })
    }
  }

  const announcement = {
    authorId: user.id,
    classId,
    subjectId: subjectId || null,
    title,
    content,
    priority,
    expiresAt: expiresAt ? new Date(expiresAt) : null,
    _id: new ObjectId(),
    createdAt: new Date(),
    updatedAt: new Date()
  }

  await db.collection(COLLECTIONS.ANNOUNCEMENTS).insertOne(announcement)

  // Create notifications for all students in the class
  const students = await db.collection(COLLECTIONS.USERS)
    .find({ classId, role: 'student', active: true })
    .project({ _id: 1 })
    .toArray()

  if (students.length > 0) {
    const notifications = students.map(student => ({
      userId: student._id.toString(),
      type: 'announcement',
      title: `New Announcement: ${title}`,
      message: content.substring(0, 100) + (content.length > 100 ? '...' : ''),
      relatedId: announcement._id.toString(),
      relatedType: 'announcement',
      read: false,
      _id: new ObjectId(),
      createdAt: new Date()
    }))

    await db.collection(COLLECTIONS.NOTIFICATIONS).insertMany(notifications)
  }

  res.status(201).json({
    success: true,
    announcement: {
      ...announcement,
      id: announcement._id.toString()
    }
  })
}))

/**
 * PATCH /api/announcements/:id
 * Update an announcement (author or admin only)
 */
router.patch('/:id', requireAuth, ensureRole('teacher', 'admin'), asyncRoute(async (req, res) => {
  const db = await connectToDatabase()
  const { id } = req.params
  const user = req.user
  const { title, content, priority, expiresAt } = req.body

  const announcement = await db.collection(COLLECTIONS.ANNOUNCEMENTS).findOne({
    _id: new ObjectId(id)
  })

  if (!announcement) {
    return res.status(404).json({ error: 'Announcement not found' })
  }

  // Only author or admin can update
  if (user.role !== 'admin' && announcement.authorId !== user.id) {
    return res.status(403).json({ error: 'Only the author or admin can update this announcement' })
  }

  const updateDoc = {}
  if (title !== undefined) updateDoc.title = title
  if (content !== undefined) updateDoc.content = content
  if (priority !== undefined) updateDoc.priority = priority
  if (expiresAt !== undefined) updateDoc.expiresAt = expiresAt ? new Date(expiresAt) : null
  updateDoc.updatedAt = new Date()

  const result = await db.collection(COLLECTIONS.ANNOUNCEMENTS).findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $set: updateDoc },
    { returnDocument: 'after' }
  )

  res.json({
    success: true,
    announcement: {
      ...result,
      id: result._id.toString()
    }
  })
}))

/**
 * DELETE /api/announcements/:id
 * Delete an announcement (author or admin only)
 */
router.delete('/:id', requireAuth, ensureRole('teacher', 'admin'), asyncRoute(async (req, res) => {
  const db = await connectToDatabase()
  const { id } = req.params
  const user = req.user

  const announcement = await db.collection(COLLECTIONS.ANNOUNCEMENTS).findOne({
    _id: new ObjectId(id)
  })

  if (!announcement) {
    return res.status(404).json({ error: 'Announcement not found' })
  }

  // Only author or admin can delete
  if (user.role !== 'admin' && announcement.authorId !== user.id) {
    return res.status(403).json({ error: 'Only the author or admin can delete this announcement' })
  }

  await db.collection(COLLECTIONS.ANNOUNCEMENTS).deleteOne({
    _id: new ObjectId(id)
  })

  // Also delete related notifications
  await db.collection(COLLECTIONS.NOTIFICATIONS).deleteMany({
    relatedId: id,
    relatedType: 'announcement'
  })

  res.json({ success: true })
}))

export default router
