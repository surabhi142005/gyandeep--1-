/**
 * server/routes/announcements.js
 * Announcement management routes
 */

import express from 'express';
const router = express.Router();
import { ObjectId } from 'mongodb';
import { connectToDatabase, COLLECTIONS } from '../db/mongoAtlas.js';
import { broadcastToRoom, broadcastToAll } from './events.js';

router.get('/', async (req, res) => {
  try {
    const db = await connectToDatabase();
    const { classId, subjectId, active } = req.query;
    
    const filter = {};
    if (classId) filter.classId = classId;
    if (subjectId) filter.subjectId = subjectId;
    if (active === 'true') {
      filter.expiresAt = { $gt: new Date() };
    }

    const announcements = await db.collection(COLLECTIONS.ANNOUNCEMENTS)
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(100)
      .toArray();
    
    res.json(announcements.map(a => ({ ...a, id: a._id?.toString() || a.id })));
  } catch (error) {
    console.error('Get announcements error:', error);
    res.status(500).json({ error: 'Failed to fetch announcements' });
  }
});

router.post('/', async (req, res) => {
  try {
    const db = await connectToDatabase();
    const { authorId, classId, subjectId, title, content, priority, expiresAt } = req.body;

    if (!authorId || !classId || !title || !content) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = await db.collection(COLLECTIONS.ANNOUNCEMENTS).insertOne({
      authorId,
      classId,
      subjectId: subjectId || null,
      title,
      content,
      priority: priority || 'normal',
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      _id: new ObjectId(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const announcementId = result.insertedId.toString();
    const announcement = {
      id: announcementId,
      authorId,
      classId,
      subjectId,
      title,
      content,
      priority,
      expiresAt,
    };

    const room = `class-${classId}`;
    broadcastToRoom(room, 'announcement', announcement);
    broadcastToAll('announcement', announcement);

    res.status(201).json({ ok: true, announcement: { ...announcement, id: announcementId } });
  } catch (error) {
    console.error('Create announcement error:', error);
    res.status(500).json({ error: 'Failed to create announcement' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const db = await connectToDatabase();
    const announcement = await db.collection(COLLECTIONS.ANNOUNCEMENTS).findOne(
      { _id: new ObjectId(req.params.id) }
    );
    
    if (!announcement) {
      return res.status(404).json({ error: 'Announcement not found' });
    }

    res.json({ ...announcement, id: announcement._id.toString() });
  } catch (error) {
    console.error('Get announcement error:', error);
    res.status(500).json({ error: 'Failed to fetch announcement' });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const db = await connectToDatabase();
    const { title, content, priority, expiresAt } = req.body;

    const updates = { updatedAt: new Date() };
    if (title) updates.title = title;
    if (content) updates.content = content;
    if (priority) updates.priority = priority;
    if (expiresAt !== undefined) updates.expiresAt = expiresAt ? new Date(expiresAt) : null;

    const result = await db.collection(COLLECTIONS.ANNOUNCEMENTS).findOneAndUpdate(
      { _id: new ObjectId(req.params.id) },
      { $set: updates },
      { returnDocument: 'after' }
    );

    if (!result) {
      return res.status(404).json({ error: 'Announcement not found' });
    }

    const announcement = { ...result, id: result._id.toString() };
    broadcastToAll('announcement', { ...announcement, type: 'updated' });

    res.json({ ok: true, announcement });
  } catch (error) {
    console.error('Update announcement error:', error);
    res.status(500).json({ error: 'Failed to update announcement' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const db = await connectToDatabase();
    
    const announcement = await db.collection(COLLECTIONS.ANNOUNCEMENTS).findOne(
      { _id: new ObjectId(req.params.id) }
    );

    if (!announcement) {
      return res.status(404).json({ error: 'Announcement not found' });
    }

    await db.collection(COLLECTIONS.ANNOUNCEMENTS).deleteOne(
      { _id: new ObjectId(req.params.id) }
    );

    broadcastToAll('announcement', { id: req.params.id, type: 'deleted' });

    res.json({ ok: true });
  } catch (error) {
    console.error('Delete announcement error:', error);
    res.status(500).json({ error: 'Failed to delete announcement' });
  }
});

router.post('/:id/expires', async (req, res) => {
  try {
    const db = await connectToDatabase();
    const { expiresAt } = req.body;

    await db.collection(COLLECTIONS.ANNOUNCEMENTS).updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { expiresAt: expiresAt ? new Date(expiresAt) : null, updatedAt: new Date() } }
    );

    res.json({ ok: true });
  } catch (error) {
    console.error('Set announcement expiry error:', error);
    res.status(500).json({ error: 'Failed to set expiry' });
  }
});

export default router;
