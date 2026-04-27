import express from 'express';
import { ObjectId } from 'mongodb';
import { connectToDatabase, COLLECTIONS } from '../db/mongoAtlas.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

router.get('/available/:classId', authMiddleware, async (req, res) => {
  try {
    const db = await connectToDatabase();
    const { classId } = req.params;

    const sessions = await db.collection(COLLECTIONS.CLASS_SESSIONS)
      .find({ classId }, { projection: { _id: 1, subjectId: 1, code: 1, sessionStatus: 1, expiry: 1 } })
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray();

    if (sessions.length === 0) {
      return res.json({ quizzes: [], total: 0 });
    }

    const sessionById = new Map(sessions.map((session) => [session._id.toString(), session]));
    const sessionIds = sessions.map((session) => session._id);

    const quizzes = await db.collection(COLLECTIONS.QUIZZES)
      .find({
        published: true,
        $or: [
          { classId },
          { sessionId: { $in: sessionIds } },
        ],
      })
      .sort({ createdAt: -1 })
      .limit(20)
      .toArray();

    const quizzesWithInfo = await Promise.all(quizzes.map(async (quiz) => {
      const session = sessionById.get(quiz.sessionId?.toString?.()) || null;
      const attempt = req.user?.id
        ? await db.collection(COLLECTIONS.QUIZ_ATTEMPTS).findOne({
            quizId: quiz._id,
            studentId: req.user.id,
          })
        : null;

      return {
        id: quiz._id.toString(),
        sessionId: quiz.sessionId?.toString?.() || quiz.sessionId,
        title: quiz.title || 'Quiz',
        subject: session?.subjectId || null,
        sessionCode: session?.code || null,
        sessionStatus: session?.sessionStatus || null,
        questionCount: quiz.questions?.length || 0,
        questions: Array.isArray(quiz.questions) ? quiz.questions : [],
        createdAt: quiz.createdAt,
        alreadyAttempted: !!attempt,
        attemptScore: attempt?.score || null,
      };
    }));

    res.json({
      quizzes: quizzesWithInfo,
      total: quizzesWithInfo.length,
    });
  } catch (error) {
    console.error('Get available quizzes error:', error);
    res.status(500).json({ error: 'Failed to get available quizzes' });
  }
});

router.get('/:id/results', authMiddleware, async (req, res) => {
  try {
    const db = await connectToDatabase();
    const { id: quizId } = req.params;

    if (!ObjectId.isValid(quizId)) {
      return res.status(400).json({ error: 'Invalid quiz id' });
    }

    const quizObjectId = new ObjectId(quizId);
    const quiz = await db.collection(COLLECTIONS.QUIZZES).findOne({ _id: quizObjectId });

    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    const attempts = await db.collection(COLLECTIONS.QUIZ_ATTEMPTS)
      .find({ quizId: quizObjectId })
      .sort({ submittedAt: -1 })
      .toArray();

    const results = await Promise.all(attempts.map(async (attempt) => {
      const student = ObjectId.isValid(attempt.studentId)
        ? await db.collection(COLLECTIONS.USERS).findOne(
            { _id: new ObjectId(attempt.studentId) },
            { projection: { name: 1, email: 1 } }
          )
        : null;

      const timeTaken = attempt.submittedAt && attempt.createdAt
        ? Math.round((new Date(attempt.submittedAt) - new Date(attempt.createdAt)) / 1000)
        : null;

      return {
        attemptId: attempt._id?.toString() || attempt.id,
        studentId: attempt.studentId,
        studentName: student?.name || student?.email || 'Unknown',
        score: attempt.score,
        totalQuestions: attempt.totalQuestions,
        correctCount: attempt.correctCount,
        percentage: attempt.score,
        submittedAt: attempt.submittedAt,
        timeTakenSeconds: timeTaken,
      };
    }));

    const summary = {
      totalAttempts: results.length,
      averageScore: results.length > 0
        ? Math.round(results.reduce((sum, result) => sum + result.score, 0) / results.length)
        : 0,
      highestScore: results.length > 0 ? Math.max(...results.map((result) => result.score)) : 0,
      lowestScore: results.length > 0 ? Math.min(...results.map((result) => result.score)) : 0,
      passRate: results.length > 0
        ? Math.round((results.filter((result) => result.score >= 60).length / results.length) * 100)
        : 0,
    };

    res.json({
      quiz: {
        id: quiz._id.toString(),
        title: quiz.title,
        questionCount: quiz.questions?.length || 0,
      },
      results,
      summary,
    });
  } catch (error) {
    console.error('Get quiz results error:', error);
    res.status(500).json({ error: 'Failed to get quiz results' });
  }
});

export default router;
