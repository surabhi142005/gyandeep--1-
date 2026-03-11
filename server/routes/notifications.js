/**
 * server/routes/notifications.js
 *
 * Notification system for students and teachers
 * GET  /api/notifications          - List user notifications
 * PATCH /api/notifications/:id/read - Mark notification as read
 * DELETE /api/notifications/:id     - Delete notification
 * POST /api/notifications           - Create notification (admin/system)
 */

import { Router } from 'express'
import { requireAuth } from '../middleware/requireAuth.js'
import { ensureRole } from '../middleware/rbac.js'
import { asyncRoute } from '../middleware/validate.js'
import { connectToDatabase, COLLECTIONS } from '../db/mongoAtlas.js'
import { ObjectId } from 'mongodb'

const router = Router()

/**
 * GET /api/notifications
 * List notifications for the authenticated user
 */
router.get('/', requireAuth, asyncRoute(async (req, res) => {
  const db = await connectToDatabase()
  const userId = req.user.id
  const { unreadOnly, limit = 50, page = 1 } = req.query

  const query = { userId }
  if (unreadOnly === 'true') {
    query.read = false
  }

  const skip = (Number(page) - 1) * Number(limit)

  const [notifications, total, unreadCount] = await Promise.all([
    db.collection(COLLECTIONS.NOTIFICATIONS)
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .toArray(),
    db.collection(COLLECTIONS.NOTIFICATIONS).countDocuments({ userId }),
    db.collection(COLLECTIONS.NOTIFICATIONS).countDocuments({ userId, read: false })
  ])

  res.json({
    notifications: notifications.map(n => ({
      ...n,
      id: n._id.toString()
    })),
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      pages: Math.ceil(total / Number(limit))
    },
    unreadCount
  })
}))

/**
 * GET /api/notifications/unread-count
 * Get count of unread notifications
 */
router.get('/unread-count', requireAuth, asyncRoute(async (req, res) => {
  const db = await connectToDatabase()
  const userId = req.user.id

  const count = await db.collection(COLLECTIONS.NOTIFICATIONS)
    .countDocuments({ userId, read: false })

  res.json({ count })
}))

/**
 * PATCH /api/notifications/:id/read
 * Mark a notification as read
 */
router.patch('/:id/read', requireAuth, asyncRoute(async (req, res) => {
  const db = await connectToDatabase()
  const { id } = req.params
  const userId = req.user.id

  const result = await db.collection(COLLECTIONS.NOTIFICATIONS).findOneAndUpdate(
    { _id: new ObjectId(id), userId },
    {
      $set: {
        read: true,
        readAt: new Date()
      }
    },
    { returnDocument: 'after' }
  )

  if (!result) {
    return res.status(404).json({ error: 'Notification not found' })
  }

  res.json({ success: true, notification: { ...result, id: result._id.toString() } })
}))

/**
 * PATCH /api/notifications/mark-all-read
 * Mark all notifications as read
 */
router.patch('/mark-all-read', requireAuth, asyncRoute(async (req, res) => {
  const db = await connectToDatabase()
  const userId = req.user.id

  const result = await db.collection(COLLECTIONS.NOTIFICATIONS).updateMany(
    { userId, read: false },
    {
      $set: {
        read: true,
        readAt: new Date()
      }
    }
  )

  res.json({ success: true, modifiedCount: result.modifiedCount })
}))

/**
 * DELETE /api/notifications/:id
 * Delete a notification
 */
router.delete('/:id', requireAuth, asyncRoute(async (req, res) => {
  const db = await connectToDatabase()
  const { id } = req.params
  const userId = req.user.id

  const result = await db.collection(COLLECTIONS.NOTIFICATIONS).deleteOne({
    _id: new ObjectId(id),
    userId
  })

  if (result.deletedCount === 0) {
    return res.status(404).json({ error: 'Notification not found' })
  }

  res.json({ success: true })
}))

/**
 * POST /api/notifications
 * Create a notification (admin only)
 */
router.post('/', requireAuth, ensureRole('admin'), asyncRoute(async (req, res) => {
  const db = await connectToDatabase()
  const { userId, type, title, message, relatedId, relatedType } = req.body

  if (!userId || !type || !title || !message) {
    return res.status(400).json({ error: 'userId, type, title, and message are required' })
  }

  const validTypes = ['quiz_published', 'grade_posted', 'attendance_marked', 'ticket_reply', 'announcement', 'system']
  if (!validTypes.includes(type)) {
    return res.status(400).json({ error: `Invalid type. Must be one of: ${validTypes.join(', ')}` })
  }

  const notification = {
    userId,
    type,
    title,
    message,
    relatedId: relatedId || null,
    relatedType: relatedType || null,
    read: false,
    _id: new ObjectId(),
    createdAt: new Date()
  }

  await db.collection(COLLECTIONS.NOTIFICATIONS).insertOne(notification)

  res.status(201).json({
    success: true,
    notification: {
      ...notification,
      id: notification._id.toString()
    }
  })
}))

/**
 * POST /api/notifications/bulk
 * Create notifications for multiple users (admin only)
 */
router.post('/bulk', requireAuth, ensureRole('admin'), asyncRoute(async (req, res) => {
  const db = await connectToDatabase()
  const { userIds, type, title, message, relatedId, relatedType } = req.body

  if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
    return res.status(400).json({ error: 'userIds array is required' })
  }

  if (!type || !title || !message) {
    return res.status(400).json({ error: 'type, title, and message are required' })
  }

  const notifications = userIds.map(userId => ({
    userId,
    type,
    title,
    message,
    relatedId: relatedId || null,
    relatedType: relatedType || null,
    read: false,
    _id: new ObjectId(),
    createdAt: new Date()
  }))

  await db.collection(COLLECTIONS.NOTIFICATIONS).insertMany(notifications)

  res.status(201).json({
    success: true,
    count: notifications.length
  })
}))

export default router
