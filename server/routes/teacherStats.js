/**
 * server/routes/teacherStats.js
 * Teacher statistics and performance routes
 */

import express from 'express';
const router = express.Router();
import { ObjectId } from 'mongodb';
import { connectToDatabase, COLLECTIONS } from '../db/mongoAtlas.js';
import { authMiddleware } from '../middleware/auth.js';

router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const db = await connectToDatabase();
    const { teacherId } = req.query;

    if (!teacherId) {
      return res.status(400).json({ error: 'teacherId is required' });
    }

    let objectId;
    try {
      objectId = new ObjectId(teacherId);
    } catch {
      return res.status(400).json({ error: 'Invalid teacherId format' });
    }

    const teacher = await db.collection(COLLECTIONS.USERS).findOne(
      { _id: objectId, role: 'teacher' },
      { projection: { performance: 1, assignedSubjects: 1, assignedClasses: 1 } }
    );

    const quizzes = await db.collection('quizzes').find(
      { teacherId: teacherId },
      { projection: { _id: 1, attempts: 1, averageScore: 1 } }
    ).toArray();

    const classIds = teacher?.assignedClasses || [];
    const students = await db.collection(COLLECTIONS.USERS).countDocuments({
      role: 'student',
      classId: { $in: classIds },
    });

    const attendanceRecords = await db.collection(COLLECTIONS.ATTENDANCE).aggregate([
      { $match: { teacherId: teacherId } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          present: { $sum: { $cond: [{ $eq: ['$status', 'Present'] }, 1, 0] } },
        },
      },
    ]).toArray();

    const attendanceRate = attendanceRecords.length > 0 && attendanceRecords[0].total > 0
      ? (attendanceRecords[0].present / attendanceRecords[0].total * 100).toFixed(1)
      : 0;

    const allAttempts = quizzes.flatMap(q => q.attempts || []);
    const avgScore = allAttempts.length > 0
      ? (allAttempts.reduce((s, a) => s + (a.score || 0), 0) / allAttempts.length).toFixed(1)
      : 0;

    res.json({
      quizzesTaken: quizzes.length,
      avgScore: parseFloat(avgScore),
      totalStudents: students,
      attendanceRate: parseFloat(attendanceRate),
    });
  } catch (error) {
    console.error('Teacher stats error:', error);
    res.status(500).json({ error: 'Failed to get teacher stats' });
  }
});

router.get('/quiz-stats', authMiddleware, async (req, res) => {
  try {
    const db = await connectToDatabase();
    const { teacherId } = req.query;

    const quizzes = await db.collection('quizzes').find(
      { teacherId: teacherId || '' }
    ).toArray();

    const allAttempts = quizzes.flatMap(q => q.attempts || []);
    const avgScore = allAttempts.length > 0
      ? (allAttempts.reduce((s, a) => s + (a.score || 0), 0) / allAttempts.length).toFixed(1)
      : 0;

    res.json({
      totalQuizzes: quizzes.length,
      avgScore: parseFloat(avgScore),
      totalAttempts: allAttempts.length,
    });
  } catch (error) {
    console.error('Quiz stats error:', error);
    res.status(500).json({ error: 'Failed to get quiz stats' });
  }
});

export default router;
