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
    
    // Parse pagination params
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;
    
    const [classes, total] = await Promise.all([
      db.collection(COLLECTIONS.CLASSES)
        .find({})
        .sort({ name: 1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      db.collection(COLLECTIONS.CLASSES).countDocuments(),
    ]);
    
    res.json({
      data: classes.map(c => ({ ...c, id: c._id?.toString() || c.id })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit), hasMore: page * limit < total },
    });
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
    const userId = req.body.userId || req.body.studentId;
    const { classId } = req.body;
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const db = await connectToDatabase();
    
    // Create query based on whether userId is a valid ObjectId
    const query = ObjectId.isValid(userId) 
      ? { _id: new ObjectId(userId) }
      : { $or: [{ id: userId }, { odId: userId }] };

    const updateData = {
      classId: classId ? (ObjectId.isValid(classId) ? new ObjectId(classId) : classId) : null,
      updatedAt: new Date(),
    };

    const result = await db.collection(COLLECTIONS.USERS).updateOne(
      query,
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // If it's a teacher, we might want to also update ClassSubject mappings
    // but for now, updating the user's classId is what the frontend expects
    
    res.json({ ok: true });
  } catch (error) {
    console.error('Assign student error:', error);
    res.status(500).json({ error: 'Failed to assign student' });
  }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const db = await connectToDatabase();
    const { id } = req.params;

    // First, unassign all students from this class
    await db.collection(COLLECTIONS.USERS).updateMany(
      { classId: new ObjectId(id) },
      { $set: { classId: null, updatedAt: new Date() } }
    );

    // Then delete the class
    await db.collection(COLLECTIONS.CLASSES).deleteOne({ _id: new ObjectId(id) });

    res.json({ ok: true, message: 'Class deleted successfully' });
  } catch (error) {
    console.error('Delete class error:', error);
    res.status(500).json({ error: 'Failed to delete class' });
  }
});

export default router;
