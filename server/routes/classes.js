/**
 * server/routes/classes.js
 * Class management routes
 */

import express from 'express';
const router = express.Router();
import { ObjectId } from 'mongodb';
import { connectToDatabase, COLLECTIONS } from '../db/mongoAtlas.js';
import { authMiddleware } from '../middleware/auth.js';

// Public endpoint - no auth required
router.get('/', async (req, res) => {
  try {
    const db = await connectToDatabase();
    const classes = await db.collection(COLLECTIONS.CLASSES)
      .find({})
      .sort({ name: 1 })
      .toArray();
    res.json(classes.map(c => ({ ...c, id: c._id?.toString() || c.id })));
  } catch (error) {
    console.error('Get classes error:', error);
    res.status(500).json({ error: 'Failed to fetch classes' });
  }
});

router.post('/', authMiddleware, async (req, res) => {
  try {
    const classes = Array.isArray(req.body) ? req.body : [req.body];
    if (classes.length === 0) {
      return res.status(400).json({ error: 'At least one class is required' });
    }

    const db = await connectToDatabase();
    const now = new Date();
    let inserted = 0;

    for (const cls of classes) {
      if (cls.id) {
        const existing = await db.collection(COLLECTIONS.CLASSES).findOne(
          { _id: new ObjectId(cls.id) }
        );
        if (existing) {
          await db.collection(COLLECTIONS.CLASSES).updateOne(
            { _id: new ObjectId(cls.id) },
            { $set: { ...cls, updatedAt: now } }
          );
        } else {
          await db.collection(COLLECTIONS.CLASSES).insertOne({
            ...cls,
            _id: new ObjectId(),
            createdAt: now,
            updatedAt: now,
          });
          inserted++;
        }
      } else {
        await db.collection(COLLECTIONS.CLASSES).insertOne({
          ...cls,
          _id: new ObjectId(),
          createdAt: now,
          updatedAt: now,
        });
        inserted++;
      }
    }

    res.json({ ok: true, inserted });
  } catch (error) {
    console.error('Create classes error:', error);
    res.status(500).json({ error: 'Failed to create classes' });
  }
});

router.post('/assign', authMiddleware, async (req, res) => {
  try {
    const { studentId, classId } = req.body;
    if (!studentId) {
      return res.status(400).json({ error: 'Student ID is required' });
    }

    const db = await connectToDatabase();
    const updateData = classId
      ? { classId: new ObjectId(classId), updatedAt: new Date() }
      : { $unset: { classId: '' }, updatedAt: new Date() };

    const result = await db.collection(COLLECTIONS.USERS).updateOne(
      { _id: new ObjectId(studentId) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }

    res.json({ ok: true });
  } catch (error) {
    console.error('Assign student error:', error);
    res.status(500).json({ error: 'Failed to assign student' });
  }
});

export default router;
