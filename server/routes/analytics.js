/**
 * server/routes/analytics.js
 * Analytics and AI-powered insights
 */

import express from 'express';
const router = express.Router();

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
    res.json({
      totalStudents: 0,
      averageGrade: 0,
      attendanceRate: 0,
      activeClasses: 0,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Analytics overview error:', error);
    res.status(500).json({ error: 'Failed to get overview' });
  }
});

export default router;
