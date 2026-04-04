/**
 * server/routes/notifications.js
 * Notification management routes
 */

import express from 'express';
const router = express.Router();
import { ObjectId } from 'mongodb';
import { connectToDatabase, COLLECTIONS } from '../db/mongoAtlas.js';
import { broadcastNotification } from '../services/broadcast.js';
import { authMiddleware } from '../middleware/auth.js';

router.get('/', authMiddleware, async (req, res) => {
  try {
    const db = await connectToDatabase();
    const notifications = await db.collection(COLLECTIONS.NOTIFICATIONS)
      .find({})
      .sort({ createdAt: -1 })
      .limit(100)
      .toArray();
    res.json(notifications.map(n => ({ ...n, id: n._id?.toString() || n.id })));
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

router.post('/', authMiddleware, async (req, res) => {
  try {
    const db = await connectToDatabase();
    const { userId, title, message, type, relatedId, relatedType } = req.body;

    const result = await db.collection(COLLECTIONS.NOTIFICATIONS).insertOne({
      userId: userId || 'all',
      title,
      message,
      type: type || 'system',
      relatedId: relatedId || null,
      relatedType: relatedType || null,
      read: false,
      _id: new ObjectId(),
      createdAt: new Date(),
    });

    const notification = { id: result.insertedId.toString(), title, message, type, relatedId, relatedType };
    
    if (userId && userId !== 'all') {
      broadcastNotification(userId, notification);
    }

    res.status(201).json({ ok: true, notification });
  } catch (error) {
    console.error('Create notification error:', error);
    res.status(500).json({ error: 'Failed to create notification' });
  }
});

router.patch('/:id/read', authMiddleware, async (req, res) => {
  try {
    const db = await connectToDatabase();
    await db.collection(COLLECTIONS.NOTIFICATIONS).updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { read: true, readAt: new Date() } }
    );
    res.json({ ok: true });
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({ error: 'Failed to update notification' });
  }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const db = await connectToDatabase();
    await db.collection(COLLECTIONS.NOTIFICATIONS).deleteOne(
      { _id: new ObjectId(req.params.id) }
    );
    res.json({ ok: true });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
});

export default router;
