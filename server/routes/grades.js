/**
 * server/routes/grades.js
 * Grade management routes with input validation
 */

import express from 'express';
const router = express.Router();
import { ObjectId } from 'mongodb';
import { connectToDatabase, COLLECTIONS } from '../db/mongoAtlas.js';
import { broadcastGradesUpdated } from '../services/broadcast.js';
import { authMiddleware } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { gradeSchemas } from '../utils/validationSchemas.js';
import { validators } from '../utils/validators.js';

const parsePagination = (query) => {
  const pageNum = Math.max(1, parseInt(query.page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
  return { pageNum, limitNum, skip: (pageNum - 1) * limitNum };
};

const validatePaginationParams = (req, res, next) => {
  const { pageNum, limitNum } = parsePagination(req.query);
  req.pagination = { page: pageNum, limit: limitNum };
  next();
};

router.get('/', authMiddleware, validatePaginationParams, async (req, res) => {
  try {
    const db = await connectToDatabase();
    const { studentId, subjectId, sortBy = 'gradedAt', sortOrder = 'desc' } = req.query;
    const { pageNum, limitNum, skip } = req.pagination;
    
    const filter = {};
    if (studentId) {
      if (!validators.isMongoId(studentId).isValid()) {
        return res.status(400).json({ error: 'Invalid studentId format' });
      }
      filter.studentId = studentId;
    }
    if (subjectId) {
      if (!validators.isMongoId(subjectId).isValid()) {
        return res.status(400).json({ error: 'Invalid subjectId format' });
      }
      filter.subjectId = subjectId;
    }

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

router.post('/', authMiddleware, validateBody(gradeSchemas.create), async (req, res) => {
  try {
    const { studentId, subjectId, score, maxScore, title, category, teacherId, quizAttemptId } = req.body;

    const scoreValidation = validators.isNumber(score, 'score', { min: 0 });
    if (!scoreValidation.isValid()) {
      return res.status(400).json({ error: scoreValidation.errors[0].message });
    }

    const maxScoreValidation = validators.isNumber(maxScore, 'maxScore', { min: 1 });
    if (!maxScoreValidation.isValid()) {
      return res.status(400).json({ error: maxScoreValidation.errors[0].message });
    }

    if (Number(score) > Number(maxScore)) {
      return res.status(400).json({ error: 'Score cannot exceed maxScore' });
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

router.post('/bulk', authMiddleware, validateBody(gradeSchemas.bulk), async (req, res) => {
  try {
    const { grades } = req.body;

    for (const grade of grades) {
      if (!grade.studentId || !grade.subjectId || grade.score === undefined || !grade.maxScore) {
        return res.status(400).json({ error: 'Each grade must have studentId, subjectId, score, and maxScore' });
      }
      if (grade.score > grade.maxScore) {
        return res.status(400).json({ error: 'Score cannot exceed maxScore in bulk grades' });
      }
    }

    const db = await connectToDatabase();
    const now = new Date();
    const docs = grades.map(g => ({
      studentId: g.studentId,
      subjectId: g.subjectId,
      score: Number(g.score),
      maxScore: Number(g.maxScore),
      title: g.title || 'Assignment',
      category: g.category || 'General',
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
    const idValidation = validators.isMongoId(req.params.id, 'id');
    if (!idValidation.isValid()) {
      return res.status(400).json({ error: 'Invalid grade ID format' });
    }

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
