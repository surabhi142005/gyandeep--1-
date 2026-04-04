/**
 * server/routes/timetable.js
 * Timetable management routes
 */

import express from 'express';
const router = express.Router();
import { ObjectId } from 'mongodb';
import { connectToDatabase, COLLECTIONS } from '../db/mongoAtlas.js';
import { authMiddleware } from '../middleware/auth.js';

router.get('/', authMiddleware, async (req, res) => {
  try {
    const db = await connectToDatabase();
    const { classId, dayOfWeek } = req.query;
    
    const filter = {};
    if (classId) filter.classId = classId;
    if (dayOfWeek) filter.dayOfWeek = dayOfWeek;

    const entries = await db.collection(COLLECTIONS.TIMETABLE)
      .find(filter)
      .sort({ dayOfWeek: 1, startTime: 1 })
      .toArray();
    
    res.json(entries.map(e => ({ ...e, id: e._id?.toString() || e.id })));
  } catch (error) {
    console.error('Get timetable error:', error);
    res.status(500).json({ error: 'Failed to fetch timetable' });
  }
});

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { entries } = req.body;
    if (!Array.isArray(entries)) {
      return res.status(400).json({ error: 'Expected array of timetable entries' });
    }

    const db = await connectToDatabase();
    const now = new Date();

    if (entries[0]?.classId) {
      await db.collection(COLLECTIONS.TIMETABLE).deleteMany({
        classId: entries[0].classId,
      });
    }

    const docs = entries.map(e => ({
      ...e,
      _id: new ObjectId(),
      createdAt: now,
      updatedAt: now,
    }));

    if (docs.length > 0) {
      await db.collection(COLLECTIONS.TIMETABLE).insertMany(docs);
    }

    res.json({ ok: true, count: docs.length });
  } catch (error) {
    console.error('Save timetable error:', error);
    res.status(500).json({ error: 'Failed to save timetable' });
  }
});

router.post('/entry', authMiddleware, async (req, res) => {
  try {
    const db = await connectToDatabase();
    const now = new Date();

    const result = await db.collection(COLLECTIONS.TIMETABLE).insertOne({
      ...req.body,
      _id: new ObjectId(),
      createdAt: now,
      updatedAt: now,
    });

    res.json({ ok: true, entry: { ...req.body, id: result.insertedId.toString() } });
  } catch (error) {
    console.error('Add timetable entry error:', error);
    res.status(500).json({ error: 'Failed to add entry' });
  }
});

router.patch('/:id', authMiddleware, async (req, res) => {
  try {
    const db = await connectToDatabase();
    await db.collection(COLLECTIONS.TIMETABLE).updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { ...req.body, updatedAt: new Date() } }
    );
    res.json({ ok: true });
  } catch (error) {
    console.error('Update timetable entry error:', error);
    res.status(500).json({ error: 'Failed to update entry' });
  }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const db = await connectToDatabase();
    const result = await db.collection(COLLECTIONS.TIMETABLE).deleteOne(
      { _id: new ObjectId(req.params.id) }
    );
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Entry not found' });
    }
    res.json({ ok: true });
  } catch (error) {
    console.error('Delete timetable entry error:', error);
    res.status(500).json({ error: 'Failed to delete entry' });
  }
});

export default router;
