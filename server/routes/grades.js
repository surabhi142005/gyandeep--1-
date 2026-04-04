/**
 * server/routes/grades.js
 * Grade management routes
 */

import express from 'express';
const router = express.Router();
import { ObjectId } from 'mongodb';
import { connectToDatabase, COLLECTIONS } from '../db/mongoAtlas.js';
import { broadcastGradesUpdated } from '../services/broadcast.js';
import { authMiddleware } from '../middleware/auth.js';

router.get('/', authMiddleware, async (req, res) => {
  try {
    const db = await connectToDatabase();
    const { studentId, subjectId, page = '1', limit = '20', sortBy = 'gradedAt', sortOrder = 'desc' } = req.query;
    
    const filter = {};
    if (studentId) filter.studentId = studentId;
    if (subjectId) filter.subjectId = subjectId;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;
    const sortOptions = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [grades, totalCount] = await Promise.all([
      db.collection(COLLECTIONS.GRADES)
        .find(filter)
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum)
        .toArray(),
      db.collection(COLLECTIONS.GRADES).countDocuments(filter),
    ]);

    res.json({
      items: grades.map(g => ({ ...g, id: g._id?.toString() || g.id })),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limitNum),
        hasNext: pageNum * limitNum < totalCount,
        hasPrev: pageNum > 1,
      },
    });
  } catch (error) {
    console.error('Get grades error:', error);
    res.status(500).json({ error: 'Failed to fetch grades' });
  }
});

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { studentId, subjectId, score, maxScore, title, category, teacherId, quizAttemptId } = req.body;
    if (!studentId || !subjectId || score === undefined || !maxScore) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const db = await connectToDatabase();
    const result = await db.collection(COLLECTIONS.GRADES).insertOne({
      studentId,
      subjectId,
      score: Number(score),
      maxScore: Number(maxScore),
      title: title || 'Assignment',
      category: category || 'General',
      teacherId: teacherId || null,
      quizAttemptId: quizAttemptId || null,
      gradedAt: new Date(),
      _id: new ObjectId(),
      createdAt: new Date(),
    });

    broadcastGradesUpdated(studentId, {
      id: result.insertedId.toString(),
      subjectId,
      score: Number(score),
      maxScore: Number(maxScore),
      title: title || 'Assignment',
      category: category || 'General',
    });

    res.status(201).json({ ok: true, grade: { id: result.insertedId.toString(), ...req.body } });
  } catch (error) {
    console.error('Create grade error:', error);
    res.status(500).json({ error: 'Failed to create grade' });
  }
});

router.post('/bulk', authMiddleware, async (req, res) => {
  try {
    const { grades } = req.body;
    if (!Array.isArray(grades)) {
      return res.status(400).json({ error: 'Expected array of grades' });
    }

    const db = await connectToDatabase();
    const now = new Date();
    const docs = grades.map(g => ({
      ...g,
      score: Number(g.score),
      maxScore: Number(g.maxScore),
      gradedAt: g.date || now,
      _id: new ObjectId(),
      createdAt: now,
    }));

    const result = await db.collection(COLLECTIONS.GRADES).insertMany(docs);
    res.json({ ok: true, count: result.insertedCount });
  } catch (error) {
    console.error('Bulk create grades error:', error);
    res.status(500).json({ error: 'Failed to create grades' });
  }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const db = await connectToDatabase();
    const result = await db.collection(COLLECTIONS.GRADES).deleteOne(
      { _id: new ObjectId(req.params.id) }
    );
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Grade not found' });
    }
    res.json({ ok: true });
  } catch (error) {
    console.error('Delete grade error:', error);
    res.status(500).json({ error: 'Failed to delete grade' });
  }
});

export default router;
