/**
 * server/routes/subjects.js
 * Subject management routes
 */

import express from 'express';
const router = express.Router();
import { ObjectId } from 'mongodb';
import { connectToDatabase, COLLECTIONS } from '../db/mongoAtlas.js';
import { authMiddleware } from '../middleware/auth.js';

router.get('/', async (req, res) => {
  try {
    const db = await connectToDatabase();
    const subjects = await db.collection(COLLECTIONS.SUBJECTS)
      .find({})
      .sort({ name: 1 })
      .toArray();
    res.json(subjects.map(s => ({ ...s, id: s._id?.toString() || s.id })));
  } catch (error) {
    console.error('Get subjects error:', error);
    res.status(500).json({ error: 'Failed to fetch subjects' });
  }
});

router.post('/', authMiddleware, async (req, res) => {
  try {
    const subjects = Array.isArray(req.body) ? req.body : [req.body];
    const db = await connectToDatabase();
    const now = new Date();
    const inserted = [];

    for (const subject of subjects) {
      if (subject.id) {
        const existing = await db.collection(COLLECTIONS.SUBJECTS).findOne(
          { _id: new ObjectId(subject.id) }
        );
        if (existing) {
          await db.collection(COLLECTIONS.SUBJECTS).updateOne(
            { _id: new ObjectId(subject.id) },
            { $set: { ...subject, updatedAt: now } }
          );
        } else {
          const result = await db.collection(COLLECTIONS.SUBJECTS).insertOne({
            ...subject,
            _id: new ObjectId(),
            createdAt: now,
            updatedAt: now,
          });
          inserted.push(result.insertedId.toString());
        }
      } else {
        const result = await db.collection(COLLECTIONS.SUBJECTS).insertOne({
          ...subject,
          _id: new ObjectId(),
          createdAt: now,
          updatedAt: now,
        });
        inserted.push(result.insertedId.toString());
      }
    }

    res.json({ ok: true, inserted: inserted.length });
  } catch (error) {
    console.error('Create subjects error:', error);
    res.status(500).json({ error: 'Failed to create subjects' });
  }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const db = await connectToDatabase();
    const result = await db.collection(COLLECTIONS.SUBJECTS).deleteOne({ _id: new ObjectId(req.params.id) });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Subject not found' });
    }
    res.json({ ok: true, message: 'Subject deleted successfully' });
  } catch (error) {
    console.error('Delete subject error:', error);
    res.status(500).json({ error: 'Failed to delete subject' });
  }
});

export default router;
