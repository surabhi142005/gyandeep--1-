/**
 * server/routes/analytics.js
 * Analytics and AI-powered insights with real MongoDB aggregates
 */

import express from 'express';
const router = express.Router();
import { connectToDatabase, COLLECTIONS } from '../db/mongoAtlas.js';

router.post('/insights', async (req, res) => {
  try {
    const { studentData, type } = req.body;
    
    if (!process.env.GEMINI_API_KEY) {
      return res.json({
        insights: [
          { type: 'performance', message: 'Configure GEMINI_API_KEY for AI-powered insights' }
        ]
      });
    }

    const insights = [];
    
    if (studentData?.grades) {
      const avgScore = studentData.grades.reduce((sum, g) => sum + (g.score / g.maxScore * 100), 0) / studentData.grades.length;
      
      if (avgScore >= 90) {
        insights.push({ type: 'achievement', message: 'Outstanding performance! Keep up the excellent work.' });
      } else if (avgScore >= 75) {
        insights.push({ type: 'progress', message: 'Good progress. Focus on areas with lower scores to improve further.' });
      } else if (avgScore < 60) {
        insights.push({ type: 'improvement', message: 'Consider reviewing the material and seeking additional help.' });
      }
    }

    if (studentData?.attendance) {
      const attendanceRate = (studentData.attendance.present / studentData.attendance.total) * 100;
      if (attendanceRate < 80) {
        insights.push({ type: 'attendance', message: 'Attendance rate is below 80%. Regular attendance improves learning outcomes.' });
      }
    }

    res.json({ insights });
  } catch (error) {
    console.error('Analytics insights error:', error);
    res.status(500).json({ error: 'Failed to generate insights' });
  }
});

router.get('/overview', async (req, res) => {
  try {
    const db = await connectToDatabase();
    const { startDate, endDate, classId } = req.query;

    const studentMatch = { role: 'student', active: true };
    const classMatch = classId ? { classId } : {};
    const dateMatch = {};
    if (startDate || endDate) {
      dateMatch.timestamp = {};
      if (startDate) dateMatch.timestamp.$gte = new Date(startDate);
      if (endDate) dateMatch.timestamp.$lte = new Date(endDate);
    }

    const [studentCount, classCount, attendanceStats, gradeStats] = await Promise.all([
      db.collection(COLLECTIONS.USERS).countDocuments(studentMatch),
      db.collection(COLLECTIONS.CLASSES).countDocuments({ ...classMatch, active: true }),
      db.collection(COLLECTIONS.ATTENDANCE).aggregate([
        { $match: dateMatch },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            present: { $sum: { $cond: [{ $eq: ['$status', 'Present'] }, 1, 0] } },
            absent: { $sum: { $cond: [{ $eq: ['$status', 'Absent'] }, 1, 0] } },
            late: { $sum: { $cond: [{ $eq: ['$status', 'Late'] }, 1, 0] } },
          }
        }
      ]).toArray(),
      db.collection(COLLECTIONS.GRADES).aggregate([
        { $match: dateMatch },
        {
          $group: {
            _id: null,
            totalGrades: { $sum: 1 },
            averageScore: { $avg: { $divide: ['$score', '$maxScore'] } },
            highestScore: { $max: { $divide: ['$score', '$maxScore'] } },
            lowestScore: { $min: { $divide: ['$score', '$maxScore'] } },
          }
        }
      ]).toArray(),
    ]);

    const att = attendanceStats[0] || { total: 0, present: 0, late: 0 };
    const grd = gradeStats[0] || { totalGrades: 0, averageScore: 0 };

    res.json({
      totalStudents: studentCount,
      activeClasses: classCount,
      attendanceRate: att.total > 0 ? ((att.present + att.late) / att.total * 100).toFixed(1) : 0,
      averageGrade: grd.averageScore ? (grd.averageScore * 100).toFixed(1) : 0,
      totalAttendance: att.total,
      presentCount: att.present,
      absentCount: att.absent,
      totalGrades: grd.totalGrades,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Analytics overview error:', error);
    res.status(500).json({ error: 'Failed to get overview' });
  }
});

router.get('/attendance-trends', async (req, res) => {
  try {
    const db = await connectToDatabase();
    const { classId, studentId, days = '30' } = req.query;

    const startDate = new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000);
    const match = { timestamp: { $gte: startDate } };
    if (classId) match.classId = classId;
    if (studentId) match.studentId = studentId;

    const trends = await db.collection(COLLECTIONS.ATTENDANCE).aggregate([
      { $match: match },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$timestamp' }
          },
          present: { $sum: { $cond: [{ $eq: ['$status', 'Present'] }, 1, 0] } },
          absent: { $sum: { $cond: [{ $eq: ['$status', 'Absent'] }, 1, 0] } },
          late: { $sum: { $cond: [{ $eq: ['$status', 'Late'] }, 1, 0] } },
          total: { $sum: 1 },
        }
      },
      { $sort: { _id: 1 } },
    ]).toArray();

    res.json(trends.map(t => ({
      date: t._id,
      present: t.present,
      absent: t.absent,
      late: t.late,
      total: t.total,
      rate: t.total > 0 ? ((t.present + t.late) / t.total * 100).toFixed(1) : 0,
    })));
  } catch (error) {
    console.error('Attendance trends error:', error);
    res.status(500).json({ error: 'Failed to get attendance trends' });
  }
});

router.get('/grade-distribution', async (req, res) => {
  try {
    const db = await connectToDatabase();
    const { classId, subjectId } = req.query;

    const match = {};
    if (classId) match.classId = classId;
    if (subjectId) match.subjectId = subjectId;

    const distribution = await db.collection(COLLECTIONS.GRADES).aggregate([
      { $match: match },
      {
        $addFields: {
          percentage: { $divide: ['$score', '$maxScore'] }
        }
      },
      {
        $bucket: {
          groupBy: '$percentage',
          boundaries: [0, 0.6, 0.7, 0.8, 0.9, 1.01],
          default: 'Other',
          output: {
            count: { $sum: 1 },
            avgScore: { $avg: '$percentage' }
          }
        }
      },
    ]).toArray();

    const labelMap = {
      '0': 'F (<60%)',
      '0.6': 'D (60-70%)',
      '0.7': 'C (70-80%)',
      '0.8': 'B (80-90%)',
      '0.9': 'A (90-100%)',
      'Other': 'Other',
    };

    res.json(distribution.map(b => ({
      range: labelMap[b._id] || b._id,
      count: b.count,
      averageScore: b.avgScore ? (b.avgScore * 100).toFixed(1) : 0,
    })));
  } catch (error) {
    console.error('Grade distribution error:', error);
    res.status(500).json({ error: 'Failed to get grade distribution' });
  }
});

router.get('/performance-by-subject', async (req, res) => {
  try {
    const db = await connectToDatabase();
    const { classId } = req.query;

    const match = classId ? { classId } : {};

    const performance = await db.collection(COLLECTIONS.GRADES).aggregate([
      { $match: match },
      {
        $lookup: {
          from: COLLECTIONS.SUBJECTS,
          localField: 'subjectId',
          foreignField: '_id',
          as: 'subject'
        }
      },
      { $unwind: '$subject' },
      {
        $group: {
          _id: '$subjectId',
          subjectName: { $first: '$subject.name' },
          totalGrades: { $sum: 1 },
          averageScore: { $avg: { $divide: ['$score', '$maxScore'] } },
          highestScore: { $max: { $divide: ['$score', '$maxScore'] } },
          lowestScore: { $min: { $divide: ['$score', '$maxScore'] } },
        }
      },
      { $sort: { averageScore: -1 } },
    ]).toArray();

    res.json(performance.map(p => ({
      subjectId: p._id?.toString(),
      subjectName: p.subjectName,
      totalGrades: p.totalGrades,
      averageScore: p.averageScore ? (p.averageScore * 100).toFixed(1) : 0,
      highestScore: p.highestScore ? (p.highestScore * 100).toFixed(1) : 0,
      lowestScore: p.lowestScore ? (p.lowestScore * 100).toFixed(1) : 0,
    })));
  } catch (error) {
    console.error('Performance by subject error:', error);
    res.status(500).json({ error: 'Failed to get performance by subject' });
  }
});

router.get('/student-performance/:studentId', async (req, res) => {
  try {
    const db = await connectToDatabase();
    const { studentId } = req.params;
    const { startDate, endDate } = req.query;

    const match = { studentId };
    if (startDate || endDate) {
      match.timestamp = {};
      if (startDate) match.timestamp.$gte = new Date(startDate);
      if (endDate) match.timestamp.$lte = new Date(endDate);
    }

    const [attendance, grades] = await Promise.all([
      db.collection(COLLECTIONS.ATTENDANCE).aggregate([
        { $match: match },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            present: { $sum: { $cond: [{ $eq: ['$status', 'Present'] }, 1, 0] } },
            absent: { $sum: { $cond: [{ $eq: ['$status', 'Absent'] }, 1, 0] } },
            late: { $sum: { $cond: [{ $eq: ['$status', 'Late'] }, 1, 0] } },
            excused: { $sum: { $cond: [{ $eq: ['$status', 'Excused'] }, 1, 0] } },
          }
        }
      ]).toArray(),
      db.collection(COLLECTIONS.GRADES).aggregate([
        { $match: { studentId, ...(startDate || endDate ? { timestamp: match.timestamp } : {}) } },
        {
          $group: {
            _id: null,
            totalGrades: { $sum: 1 },
            averageScore: { $avg: { $divide: ['$score', '$maxScore'] } },
            highestScore: { $max: { $divide: ['$score', '$maxScore'] } },
            lowestScore: { $min: { $divide: ['$score', '$maxScore'] } },
          }
        }
      ]).toArray(),
    ]);

    const att = attendance[0] || { total: 0, present: 0, late: 0, excused: 0 };
    const grd = grades[0] || { totalGrades: 0, averageScore: 0 };

    res.json({
      studentId,
      attendance: {
        total: att.total,
        present: att.present,
        absent: att.absent,
        late: att.late,
        excused: att.excused,
        rate: att.total > 0 ? ((att.present + att.late) / att.total * 100).toFixed(1) : 0,
      },
      grades: {
        total: grd.totalGrades,
        average: grd.averageScore ? (grd.averageScore * 100).toFixed(1) : 0,
        highest: grd.highestScore ? (grd.highestScore * 100).toFixed(1) : 0,
        lowest: grd.lowestScore ? (grd.lowestScore * 100).toFixed(1) : 0,
      },
    });
  } catch (error) {
    console.error('Student performance error:', error);
    res.status(500).json({ error: 'Failed to get student performance' });
  }
});

export default router;
