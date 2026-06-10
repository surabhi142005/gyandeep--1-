/**
 * server/routes/analytics.js
 * Analytics and AI-powered insights using unified AI service
 */

import express from 'express';
const router = express.Router();
import { ObjectId } from 'mongodb';
import { connectToDatabase, COLLECTIONS } from '../db/mongoAtlas.js';
import { authMiddleware } from '../middleware/auth.js';
import { callAI, parseAIJson, getAIStatus } from '../services/aiService.js';

router.get('/ai-status', async (req, res) => {
  try {
    const status = getAIStatus();
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/insights', authMiddleware, async (req, res) => {
  try {
    const { studentData, type } = req.body;

    const prompt = `Analyze this student performance data and provide 3-5 concise, actionable insights.

Student Data:
${JSON.stringify(studentData, null, 2)}

Format your response ONLY as a JSON array of objects:
[
  { "type": "achievement|improvement|attendance|progress", "message": "Short actionable insight message" }
]`;

    try {
      const text = await callAI(prompt, {
        temperature: 0.4,
        maxTokens: 1024,
        jsonMode: true,
        purpose: 'analytics'
      });
      const insights = parseAIJson(text);
      if (Array.isArray(insights) && insights.length > 0) {
        return res.json({ insights, provider: 'ai' });
      }
    } catch (aiErr) {
      console.warn('[Analytics] AI insight generation failed:', aiErr.message);
    }

    // Fallback manual insights if AI fails
    const insights = [];
    if (studentData?.grades?.length > 0) {
      const avgScore = studentData.grades.reduce((sum, g) => sum + (g.score / g.maxScore * 100), 0) / studentData.grades.length;
      if (avgScore >= 90) insights.push({ type: 'achievement', message: 'Outstanding performance! Keep up the excellent work.' });
      else if (avgScore < 60) insights.push({ type: 'improvement', message: 'Consider reviewing the material and seeking additional help.' });
    }

    if (studentData?.attendance) {
      const attendanceRate = (studentData.attendance.present / studentData.attendance.total) * 100;
      if (attendanceRate < 80) insights.push({ type: 'attendance', message: 'Attendance rate is below 80%. Regular attendance improves learning outcomes.' });
    }

    res.json({ insights: insights.length > 0 ? insights : [{ type: 'progress', message: 'Keep consistent with your studies and attendance.' }], provider: 'fallback' });
  } catch (error) {
    console.error('Analytics insights error:', error);
    res.status(500).json({ error: 'Failed to generate insights' });
  }
});

router.get('/overview', authMiddleware, async (req, res) => {
  try {
    const db = await connectToDatabase();
    const { startDate, endDate, classId } = req.query;

    const classIdQuery = classId ? (ObjectId.isValid(classId) ? new ObjectId(classId) : classId) : null;
    const studentMatch = { role: 'student', active: true };
    if (classIdQuery) {
      studentMatch.classId = classIdQuery;
    }
    const classMatch = classIdQuery ? { _id: classIdQuery } : {};

    const dateMatch = {};
    if (startDate || endDate) {
      dateMatch.timestamp = {};
      if (startDate) dateMatch.timestamp.$gte = new Date(startDate);
      if (endDate) dateMatch.timestamp.$lte = new Date(endDate);
    }

    const gradeDateMatch = {};
    if (startDate || endDate) {
      gradeDateMatch.gradedAt = {};
      if (startDate) gradeDateMatch.gradedAt.$gte = new Date(startDate);
      if (endDate) gradeDateMatch.gradedAt.$lte = new Date(endDate);
    }

    const attendanceMatch = { ...dateMatch };
    if (classIdQuery) {
      attendanceMatch.classId = classIdQuery;
    }

    const gradePipeline = [];
    if (startDate || endDate) {
      gradePipeline.push({ $match: gradeDateMatch });
    }
    if (classIdQuery) {
      gradePipeline.push(
        {
          $lookup: {
            from: COLLECTIONS.USERS,
            let: { studentId: '$studentId' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      {
                        $or: [
                          { $eq: ['$_id', { $toObjectId: '$$studentId' }] },
                          { $eq: ['$id', '$$studentId'] }
                        ]
                      },
                      { $eq: ['$classId', classIdQuery] }
                    ]
                  }
                }
              }
            ],
            as: 'student'
          }
        },
        { $match: { 'student.0': { $exists: true } } }
      );
    }
    gradePipeline.push({
      $group: {
        _id: null,
        totalGrades: { $sum: 1 },
        averageScore: { $avg: { $divide: ['$score', '$maxScore'] } },
        highestScore: { $max: { $divide: ['$score', '$maxScore'] } },
        lowestScore: { $min: { $divide: ['$score', '$maxScore'] } },
      }
    });

    const [studentCount, classCount, attendanceStats, gradeStats] = await Promise.all([
      db.collection(COLLECTIONS.USERS).countDocuments(studentMatch),
      db.collection(COLLECTIONS.CLASSES).countDocuments({ ...classMatch }),
      db.collection(COLLECTIONS.ATTENDANCE).aggregate([
        { $match: attendanceMatch },
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
      db.collection(COLLECTIONS.GRADES).aggregate(gradePipeline).toArray(),
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

router.get('/attendance-trends', authMiddleware, async (req, res) => {
  try {
    const db = await connectToDatabase();
    const { classId, studentId, days = '30' } = req.query;

    const classIdQuery = classId ? (ObjectId.isValid(classId) ? new ObjectId(classId) : classId) : null;
    const studentIdQuery = studentId ? (ObjectId.isValid(studentId) ? new ObjectId(studentId) : studentId) : null;

    const startDate = new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000);
    const match = { timestamp: { $gte: startDate } };
    if (classIdQuery) match.classId = classIdQuery;
    if (studentIdQuery) match.studentId = studentIdQuery;

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
      rate: t.total > 0 ? ((t.present + t.late) / t.total * 100).toFixed(1) : 0
    })));
  } catch (error) {
    console.error('Attendance trends error:', error);
    res.status(500).json({ error: 'Failed to get attendance trends' });
  }
});

router.get('/grade-distribution', authMiddleware, async (req, res) => {
  try {
    const db = await connectToDatabase();
    const { classId, subjectId } = req.query;

    const match = {};
    if (classId) match.classId = ObjectId.isValid(classId) ? new ObjectId(classId) : classId;
    if (subjectId) match.subjectId = ObjectId.isValid(subjectId) ? new ObjectId(subjectId) : subjectId;

    const distribution = await db.collection(COLLECTIONS.GRADES).aggregate([
      { $match: match },
      {
        $project: {
          percentage: {
            $multiply: [{ $divide: ['$score', '$maxScore'] }, 100]
          }
        }
      },
      {
        $bucket: {
          groupBy: '$percentage',
          boundaries: [0, 60, 70, 80, 90, 101],
          default: 'Other',
          output: {
            count: { $sum: 1 }
          }
        }
      }
    ]).toArray();

    res.json(distribution.map(b => ({
      range: b._id,
      count: b.count
    })));
  } catch (error) {
    console.error('Grade distribution error:', error);
    res.status(500).json({ error: 'Failed to get grade distribution' });
  }
});

router.get('/student-performance/:studentId', authMiddleware, async (req, res) => {
  try {
    const db = await connectToDatabase();
    const { studentId } = req.params;

    const studentFilter = ObjectId.isValid(studentId)
      ? { $or: [{ studentId }, { studentId: new ObjectId(studentId) }] }
      : { studentId };

    const [grades, attendance, quizResults] = await Promise.all([
      db.collection(COLLECTIONS.GRADES).find(studentFilter).sort({ gradedAt: -1, createdAt: -1 }).limit(20).toArray(),
      db.collection(COLLECTIONS.ATTENDANCE).find(studentFilter).sort({ timestamp: -1 }).limit(30).toArray(),
      db.collection(COLLECTIONS.QUIZ_ATTEMPTS).find(studentFilter).sort({ submittedAt: -1 }).limit(10).toArray()
    ]);

    const gradeStats = grades.length > 0 ? {
      average: (grades.reduce((sum, g) => sum + (g.score / g.maxScore * 100), 0) / grades.length).toFixed(1),
      highest: Math.max(...grades.map(g => g.score / g.maxScore * 100)).toFixed(1),
      lowest: Math.min(...grades.map(g => g.score / g.maxScore * 100)).toFixed(1),
      total: grades.length
    } : null;

    const attendanceStats = attendance.length > 0 ? {
      present: attendance.filter(a => a.status === 'Present').length,
      absent: attendance.filter(a => a.status === 'Absent').length,
      late: attendance.filter(a => a.status === 'Late').length,
      rate: (attendance.filter(a => a.status !== 'Absent').length / attendance.length * 100).toFixed(1)
    } : null;

    const quizStats = quizResults.length > 0 ? {
      average: (quizResults.reduce((sum, q) => sum + q.score, 0) / quizResults.length).toFixed(1),
      best: Math.max(...quizResults.map(q => q.score)),
      attempts: quizResults.length
    } : null;

    res.json({
      grades: gradeStats,
      attendance: attendanceStats,
      quizzes: quizStats,
      recentGrades: grades.slice(0, 5)
    });
  } catch (error) {
    console.error('Student performance error:', error);
    res.status(500).json({ error: 'Failed to get student performance' });
  }
});

router.get('/weekly-attendance/:id', authMiddleware, async (req, res) => {
  try {
    const db = await connectToDatabase();
    const { id } = req.params;

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const queryId = ObjectId.isValid(id) ? new ObjectId(id) : id;
    const match = {
      timestamp: { $gte: oneWeekAgo },
      status: 'Present',
      $or: [
        { classId: id },
        { classId: queryId },
        { teacherId: id },
        { teacherId: queryId }
      ]
    };

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const trends = await db.collection(COLLECTIONS.ATTENDANCE).aggregate([
      { $match: match },
      {
        $group: {
          _id: { $dayOfWeek: '$timestamp' },
          present: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]).toArray();

    const data = dayNames.map((name, idx) => {
      const found = trends.find(t => t._id === idx + 1);
      return { date: name, present: found ? found.present : 0 };
    });

    res.json(data);
  } catch (error) {
    console.error('Weekly attendance trends error:', error);
    res.status(500).json({ error: 'Failed to get weekly attendance trends' });
  }
});

router.get('/performance-by-subject', authMiddleware, async (req, res) => {
  try {
    const db = await connectToDatabase();
    const { classId } = req.query;

    const pipeline = [];
    if (classId) {
      const classIdQuery = ObjectId.isValid(classId) ? new ObjectId(classId) : classId;
      pipeline.push(
        {
          $lookup: {
            from: COLLECTIONS.USERS,
            let: { studentId: '$studentId' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      {
                        $or: [
                          { $eq: ['$_id', { $toObjectId: '$$studentId' }] },
                          { $eq: ['$id', '$$studentId'] }
                        ]
                      },
                      { $eq: ['$classId', classIdQuery] }
                    ]
                  }
                }
              }
            ],
            as: 'student'
          }
        },
        { $match: { 'student.0': { $exists: true } } }
      );
    }

    pipeline.push(
      {
        $group: {
          _id: '$subjectId',
          avgScore: { $avg: { $multiply: [{ $divide: ['$score', '$maxScore'] }, 100] } }
        }
      },
      {
        $lookup: {
          from: COLLECTIONS.SUBJECTS,
          let: { subjectId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $or: [
                    { $eq: ['$_id', { $toObjectId: '$$subjectId' }] },
                    { $eq: ['$id', '$$subjectId'] },
                    { $eq: ['$name', '$$subjectId'] }
                  ]
                }
              }
            }
          ],
          as: 'subjectInfo'
        }
      },
      {
        $project: {
          subject: { $ifNull: [{ $arrayElemAt: ['$subjectInfo.name', 0] }, '$_id'] },
          avgScore: { $round: ['$avgScore', 1] }
        }
      }
    );

    const performance = await db.collection(COLLECTIONS.GRADES).aggregate(pipeline).toArray();
    res.json(performance);
  } catch (error) {
    console.error('Performance by subject error:', error);
    res.status(500).json({ error: 'Failed to get performance by subject' });
  }
});

export default router;