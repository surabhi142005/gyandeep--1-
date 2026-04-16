/**
 * server/routes/sessions.js
 * Class session routes with real-time quiz support
 */

import express from 'express';
const router = express.Router();
import { ObjectId } from 'mongodb';
import { connectToDatabase, COLLECTIONS } from '../db/mongoAtlas.js';
import { broadcastToRoom, broadcastToAll } from './events.js';
import { authMiddleware } from '../middleware/auth.js';
import { checkAndAssignBadges } from '../services/gamification.js';
import { RateLimiter } from '../middleware/rateLimiter.js';

// Rate limiter for quiz submissions: 3 attempts per 5 minutes per student
const quizSubmitRateLimiter = new RateLimiter({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 3,
  message: { error: 'Too many quiz submissions. Please wait 5 minutes before trying again.' },
  keyGenerator: (req) => {

// Calculate distance between two GPS coordinates (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const studentId = req.body?.studentId || '';
    return `quiz:${ip}:${studentId}`;
  },
});

router.get('/', authMiddleware, async (req, res) => {
  try {
    const db = await connectToDatabase();
    const { teacherId, classId, status } = req.query;
    
    const filter = {};
    if (teacherId) filter.teacherId = teacherId;
    if (classId) filter.classId = classId;
    if (status) filter.sessionStatus = status;

    const sessions = await db.collection(COLLECTIONS.CLASS_SESSIONS)
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray();
    
    res.json(sessions.map(s => ({ ...s, id: s._id?.toString() || s.id })));
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

router.get('/active', authMiddleware, async (req, res) => {
  try {
    const db = await connectToDatabase();
    const { teacherId } = req.query;
    
    if (!teacherId) {
      return res.status(400).json({ error: 'teacherId is required' });
    }

    // Find active session (waiting or active status)
    const activeSession = await db.collection(COLLECTIONS.CLASS_SESSIONS).findOne({
      teacherId,
      sessionStatus: { $in: ['waiting', 'active'] },
      expiry: { $gt: new Date() }, // Not expired
    });

    if (!activeSession) {
      return res.json({ active: false, session: null });
    }

    // Calculate remaining time
    const remainingTime = activeSession.expiry 
      ? Math.max(0, new Date(activeSession.expiry).getTime() - Date.now())
      : null;

    res.json({
      active: true,
      session: {
        id: activeSession._id.toString(),
        teacherId: activeSession.teacherId,
        classId: activeSession.classId,
        subjectId: activeSession.subjectId,
        code: activeSession.code,
        sessionStatus: activeSession.sessionStatus,
        expiry: activeSession.expiry,
        remainingTime,
        locationEnabled: activeSession.locationEnabled,
        faceEnabled: activeSession.faceEnabled,
        quizPublished: activeSession.quizPublished,
        createdAt: activeSession.createdAt,
      },
    });
  } catch (error) {
    console.error('Get active session error:', error);
    res.status(500).json({ error: 'Failed to fetch active session' });
  }
});

router.post('/', authMiddleware, async (req, res) => {
  try {
    const db = await connectToDatabase();
    const { teacherId, classId, subjectId, code, locationEnabled, locationRadius, locationLat, locationLng, faceEnabled } = req.body;

    if (!teacherId || !subjectId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const sessionCode = code || `SESSION-${Date.now().toString(36).toUpperCase()}`;
    const expiry = new Date(Date.now() + 10 * 60 * 1000);

    const sessionData = {
      teacherId,
      classId: classId || null,
      subjectId,
      code: sessionCode,
      sessionStatus: 'waiting',
      expiry,
      locationEnabled: locationEnabled || false,
      locationRadius: locationRadius || 100,
      locationAnchor: locationLat && locationLng ? { lat: locationLat, lng: locationLng } : null,
      faceEnabled: faceEnabled || false,
      _id: new ObjectId(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection(COLLECTIONS.CLASS_SESSIONS).insertOne(sessionData);

    const sessionId = result.insertedId.toString();
    const room = `session-${sessionId}`;

    const session = {
      id: sessionId,
      teacherId,
      classId,
      subjectId,
      code: sessionCode,
      sessionStatus: 'waiting',
    };

    broadcastToAll('session-update', { ...session, type: 'created' });

    res.status(201).json({ ok: true, session: { ...session, id: sessionId }, room });
  } catch (error) {
    console.error('Create session error:', error);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const db = await connectToDatabase();
    const session = await db.collection(COLLECTIONS.CLASS_SESSIONS).findOne(
      { _id: new ObjectId(req.params.id) }
    );
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json({ ...session, id: session._id.toString() });
  } catch (error) {
    console.error('Get session error:', error);
    res.status(500).json({ error: 'Failed to fetch session' });
  }
});

router.patch('/:id/start', async (req, res) => {
  try {
    const db = await connectToDatabase();
    const sessionId = req.params.id;
    const room = `session-${sessionId}`;

    await db.collection(COLLECTIONS.CLASS_SESSIONS).updateOne(
      { _id: new ObjectId(sessionId) },
      { $set: { sessionStatus: 'active', updatedAt: new Date() } }
    );

    broadcastToRoom(room, 'session-update', { id: sessionId, sessionStatus: 'active', type: 'started' });
    broadcastToAll('session-update', { id: sessionId, sessionStatus: 'active', type: 'started' });

    res.json({ ok: true, sessionStatus: 'active' });
  } catch (error) {
    console.error('Start session error:', error);
    res.status(500).json({ error: 'Failed to start session' });
  }
});

router.patch('/:id/end', async (req, res) => {
  try {
    const db = await connectToDatabase();
    const sessionId = req.params.id;
    const room = `session-${sessionId}`;

    await db.collection(COLLECTIONS.CLASS_SESSIONS).updateOne(
      { _id: new ObjectId(sessionId) },
      { $set: { sessionStatus: 'ended', endedAt: new Date(), updatedAt: new Date() } }
    );

    broadcastToRoom(room, 'session-update', { id: sessionId, sessionStatus: 'ended', type: 'ended' });
    broadcastToAll('session-update', { id: sessionId, sessionStatus: 'ended', type: 'ended' });

    res.json({ ok: true, sessionStatus: 'ended' });
  } catch (error) {
    console.error('End session error:', error);
    res.status(500).json({ error: 'Failed to end session' });
  }
});

router.get('/:id/warning', authMiddleware, async (req, res) => {
  try {
    const db = await connectToDatabase();
    const sessionId = req.params.id;

    const session = await db.collection(COLLECTIONS.CLASS_SESSIONS).findOne(
      { _id: new ObjectId(sessionId) }
    );

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const expiryTime = new Date(session.expiry).getTime();
    const now = Date.now();
    const timeRemaining = expiryTime - now;
    const twoMinutes = 2 * 60 * 1000;

    if (timeRemaining <= 0) {
      return res.json({ warning: false, message: 'Session has expired' });
    }

    if (timeRemaining <= twoMinutes) {
      broadcastToRoom(`session-${sessionId}`, 'session_warning', {
        sessionId,
        message: 'Session will expire in less than 2 minutes',
        timeRemaining,
      });
      return res.json({
        warning: true,
        message: 'Session will expire soon',
        timeRemaining,
      });
    }

    res.json({ warning: false, timeRemaining });
  } catch (error) {
    console.error('Session warning error:', error);
    res.status(500).json({ error: 'Failed to get session warning' });
  }
});

router.post('/:id/quiz/start', async (req, res) => {
  try {
    const db = await connectToDatabase();
    const sessionId = req.params.id;
    const { questions, title } = req.body;
    const room = `session-${sessionId}`;

    const session = await db.collection(COLLECTIONS.CLASS_SESSIONS).findOne({ _id: new ObjectId(sessionId) });
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const quiz = {
      sessionId: new ObjectId(sessionId),
      questions,
      title: title || 'Quick Quiz',
      published: true,
      publishedAt: new Date(),
      _id: new ObjectId(),
      createdAt: new Date(),
    };

    await db.collection(COLLECTIONS.QUIZZES).insertOne(quiz);

    await db.collection(COLLECTIONS.CLASS_SESSIONS).updateOne(
      { _id: new ObjectId(sessionId) },
      { $set: { quizPublished: true, quizPublishedAt: new Date(), updatedAt: new Date() } }
    );

    if (session.classId) {
      const students = await db.collection(COLLECTIONS.USERS)
        .find({ classId: session.classId, role: 'student', active: true })
        .project({ _id: 1 })
        .toArray();
      
      const notifications = students.map(s => ({
        userId: s._id.toString(),
        title: 'New Quiz Published',
        message: `A new quiz "${quiz.title}" has been published for ${session.subjectId}`,
        type: 'quiz',
        relatedId: quiz._id.toString(),
        relatedType: 'quiz',
        read: false,
        _id: new ObjectId(),
        createdAt: new Date(),
      }));
      
      if (notifications.length > 0) {
        await db.collection(COLLECTIONS.NOTIFICATIONS).insertMany(notifications);
      }
    }

    broadcastToRoom(room, 'quiz-update', {
      id: quiz._id.toString(),
      sessionId,
      title: quiz.title,
      questionCount: questions?.length || 0,
      type: 'started',
    });
    broadcastToAll('quiz-update', {
      id: quiz._id.toString(),
      sessionId,
      title: quiz.title,
      questionCount: questions?.length || 0,
      type: 'started',
    });

    res.status(201).json({ ok: true, quiz: { ...quiz, id: quiz._id.toString() } });
  } catch (error) {
    console.error('Start quiz error:', error);
    res.status(500).json({ error: 'Failed to start quiz' });
  }
});

/**
 * PUT /api/sessions/:id/quiz/edit
 * Edit existing quiz questions (teacher only)
 */
router.put('/:id/quiz/edit', authMiddleware, async (req, res) => {
  try {
    const db = await connectToDatabase();
    const sessionId = req.params.id;
    const { quizId, questions, title } = req.body;
    const teacherId = req.user?.id;

    if (!quizId) {
      return res.status(400).json({ error: 'quizId is required' });
    }

    const session = await db.collection(COLLECTIONS.CLASS_SESSIONS).findOne({ _id: new ObjectId(sessionId) });
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Verify teacher owns this session
    if (session.teacherId !== teacherId) {
      return res.status(403).json({ error: 'Not authorized to edit this quiz' });
    }

    const updateData = {};
    if (questions) updateData.questions = questions;
    if (title) updateData.title = title;
    updateData.updatedAt = new Date();

    await db.collection(COLLECTIONS.QUIZZES).updateOne(
      { _id: new ObjectId(quizId) },
      { $set: updateData }
    );

    const updatedQuiz = await db.collection(COLLECTIONS.QUIZZES).findOne({ _id: new ObjectId(quizId) });

    res.json({ ok: true, quiz: { ...updatedQuiz, id: updatedQuiz._id.toString() } });
  } catch (error) {
    console.error('Edit quiz error:', error);
    res.status(500).json({ error: 'Failed to edit quiz' });
  }
});

router.post('/:id/quiz/next', async (req, res) => {
  try {
    const db = await connectToDatabase();
    const sessionId = req.params.id;
    const { questionIndex } = req.body;
    const room = `session-${sessionId}`;

    broadcastToRoom(room, 'quiz-update', {
      sessionId,
      questionIndex,
      type: 'next_question',
    });
    broadcastToAll('quiz-update', {
      sessionId,
      questionIndex,
      type: 'next_question',
    });

    res.json({ ok: true, questionIndex });
  } catch (error) {
    console.error('Next question error:', error);
    res.status(500).json({ error: 'Failed to broadcast next question' });
  }
});

router.post('/:id/quiz/end', async (req, res) => {
  try {
    const db = await connectToDatabase();
    const sessionId = req.params.id;
    const room = `session-${sessionId}`;

    await db.collection(COLLECTIONS.CLASS_SESSIONS).updateOne(
      { _id: new ObjectId(sessionId) },
      { $set: { quizPublished: false, updatedAt: new Date() } }
    );

    broadcastToRoom(room, 'quiz-update', { sessionId, type: 'ended' });
    broadcastToAll('quiz-update', { sessionId, type: 'ended' });

    res.json({ ok: true });
  } catch (error) {
    console.error('End quiz error:', error);
    res.status(500).json({ error: 'Failed to end quiz' });
  }
});

router.post('/:id/attendance', async (req, res) => {
  try {
    const db = await connectToDatabase();
    const sessionId = req.params.id;
    const { studentId, status, location } = req.body;
    const room = `session-${sessionId}`;

    // Get session to check location settings
    const session = await db.collection(COLLECTIONS.CLASS_SESSIONS).findOne({
      _id: new ObjectId(sessionId)
    });

    // Validate location if required
    if (session?.locationEnabled && session?.locationAnchor) {
      if (!location || !location.latitude || !location.longitude) {
        return res.status(400).json({ 
          error: 'Location is required for this session',
          locationRequired: true,
        });
      }

      const distance = calculateDistance(
        location.latitude,
        location.longitude,
        session.locationAnchor.lat,
        session.locationAnchor.lng
      );

      if (distance > (session.locationRadius || 100)) {
        return res.status(403).json({
          error: 'You are too far from the class location',
          distance,
          maxDistance: session.locationRadius,
          locationRequired: true,
        });
      }
    }

    const attendance = {
      sessionId: new ObjectId(sessionId),
      studentId,
      classId: session?.classId || null,
      teacherId: session?.teacherId || null,
      status: status || 'Present',
      markedAt: new Date(),
      locationVerified: session?.locationEnabled ? true : undefined,
      _id: new ObjectId(),
      createdAt: new Date(),
    };

    await db.collection(COLLECTIONS.ATTENDANCE).insertOne(attendance);

    broadcastToRoom(room, 'attendance-changed', {
      sessionId,
      studentId,
      status: attendance.status,
    });
    broadcastToUser(studentId, 'attendance-changed', {
      sessionId,
      status: attendance.status,
    });

    res.status(201).json({ ok: true, attendance: { ...attendance, id: attendance._id.toString() } });
  } catch (error) {
    console.error('Mark attendance error:', error);
    res.status(500).json({ error: 'Failed to mark attendance' });
  }
});

router.get('/code/:code/verify', async (req, res) => {
  try {
    const db = await connectToDatabase();
    const { code } = req.params;

    const session = await db.collection(COLLECTIONS.CLASS_SESSIONS).findOne({
      code: code.toUpperCase(),
      sessionStatus: { $ne: 'ended' }
    });

    if (!session) {
      return res.status(404).json({ valid: false, error: 'Invalid or expired session code' });
    }

    if (session.expiry && new Date(session.expiry) < new Date()) {
      return res.status(410).json({ valid: false, error: 'Session code has expired' });
    }

    res.json({
      valid: true,
      sessionId: session._id.toString(),
      teacherId: session.teacherId,
      classId: session.classId,
      subjectId: session.subjectId,
      locationEnabled: session.locationEnabled || false,
      locationRadius: session.locationRadius || 100,
      locationAnchor: session.locationAnchor || null,
      faceEnabled: session.faceEnabled || false,
    });
  } catch (error) {
    console.error('Verify session code error:', error);
    res.status(500).json({ valid: false, error: 'Failed to verify session code' });
  }
});

router.post('/:id/quiz/submit', 
  authMiddleware, 
  quizSubmitRateLimiter.middleware(),
  async (req, res) => {
    try {
      const db = await connectToDatabase();
      const sessionId = req.params.id;
      const { studentId, answers } = req.body;
      const room = `session-${sessionId}`;

      if (!studentId || !answers) {
        return res.status(400).json({ error: 'studentId and answers are required' });
      }

      // Check for duplicate submission
      const existingAttempt = await db.collection(COLLECTIONS.QUIZ_ATTEMPTS).findOne({
        sessionId: new ObjectId(sessionId),
        studentId,
      });
      
      if (existingAttempt) {
        return res.status(409).json({ 
          error: 'You have already submitted this quiz',
          existingAttemptId: existingAttempt._id.toString(),
          originalScore: existingAttempt.score,
        });
      }

      // Get session to have access to teacherId
      const session = await db.collection(COLLECTIONS.CLASS_SESSIONS).findOne(
        { _id: new ObjectId(sessionId) }
      );

      const quiz = await db.collection(COLLECTIONS.QUIZZES).findOne(
        { sessionId: new ObjectId(sessionId) },
        { sort: { createdAt: -1 } }
      );

      if (!quiz) {
        return res.status(404).json({ error: 'No quiz found for this session' });
      }

      let correctCount = 0;
    const results = quiz.questions.map((question, index) => {
      const studentAnswer = answers[index]?.answer || '';
      const isCorrect = studentAnswer.toUpperCase().trim() === question.correctAnswer?.toUpperCase().trim();
      if (isCorrect) correctCount++;
      return {
        questionId: question.id,
        correctAnswer: question.correctAnswer,
        studentAnswer,
        isCorrect,
        explanation: question.explanation,
      };
    });

    const totalQuestions = quiz.questions.length;
    const score = Math.round((correctCount / totalQuestions) * 100);

    const attempt = {
      sessionId: new ObjectId(sessionId),
      studentId,
      quizId: quiz._id,
      answers: results,
      score,
      totalQuestions,
      correctCount,
      submittedAt: new Date(),
      _id: new ObjectId(),
      createdAt: new Date(),
    };

    await db.collection(COLLECTIONS.QUIZ_ATTEMPTS).insertOne(attempt);

    await db.collection(COLLECTIONS.CLASS_SESSIONS).updateOne(
      { _id: new ObjectId(sessionId) },
      { $inc: { quizAttempts: 1 } }
    );

    let xpAwarded = 0;
    let coinsAwarded = 0;
    if (score >= 60) {
      xpAwarded = 50;
      coinsAwarded = 10;
      if (score === 100) {
        xpAwarded += 30;
        coinsAwarded += 5;
      }
      await db.collection(COLLECTIONS.USERS).updateOne(
        { _id: new ObjectId(studentId) },
        { 
          $inc: { xp: xpAwarded, coins: coinsAwarded },
          $set: { lastActive: new Date() }
        }
      );
    }

    // Broadcast XP and leaderboard update
    if (xpAwarded > 0 || coinsAwarded > 0) {
      const updatedUser = await db.collection(COLLECTIONS.USERS).findOne(
        { _id: new ObjectId(studentId) },
        { projection: { name: 1, email: 1, xp: 1, level: 1, coins: 1, badges: 1 } }
      );

      broadcastToUser(studentId, 'xp_updated', {
        studentId,
        xp: updatedUser?.xp || 0,
        level: updatedUser?.level || 1,
        coins: updatedUser?.coins || 0,
        xpAwarded,
        coinsAwarded,
        totalXp: updatedUser?.xp || 0,
      });

      broadcastToAll('leaderboard_update', {
        studentId,
        name: updatedUser?.name,
        xp: updatedUser?.xp || 0,
        level: updatedUser?.level || 1,
        coins: updatedUser?.coins || 0,
      });

      checkAndAssignBadges(studentId).catch(err => console.error('Badge check error:', err));
    }

    // Broadcast quiz submission events
    broadcastToRoom(room, 'quiz_submission', {
      sessionId,
      studentId,
      score,
      totalQuestions,
      correctCount,
      xpAwarded,
      coinsAwarded,
      attemptId: attempt._id.toString(),
    });
    broadcastToUser(studentId, 'quiz_submission', {
      sessionId,
      score,
      totalQuestions,
      correctCount,
      xpAwarded,
      coinsAwarded,
      attemptId: attempt._id.toString(),
    });
    broadcastToAll('quiz_submission', {
      sessionId,
      studentId,
      score,
      totalQuestions,
      correctCount,
      xpAwarded,
      coinsAwarded,
    });

    // Send notification to teacher about quiz submission
    if (session?.teacherId) {
      const student = await db.collection(COLLECTIONS.USERS).findOne({ _id: new ObjectId(studentId) });
      const studentName = student?.name || student?.email || 'A student';
      
      const notification = {
        userId: session.teacherId,
        title: 'Quiz Submitted',
        message: `${studentName} submitted quiz with score: ${score}%`,
        type: 'quiz',
        relatedId: sessionId,
        relatedType: 'session',
        read: false,
        _id: new ObjectId(),
        createdAt: new Date(),
      };
      
      await db.collection(COLLECTIONS.NOTIFICATIONS).insertOne(notification);
      
      broadcastToUser(session.teacherId, 'notification', {
        id: notification._id.toString(),
        title: notification.title,
        message: notification.message,
        type: notification.type,
        relatedId: notification.relatedId,
        timestamp: notification.createdAt.toISOString(),
      });
    }

    // Broadcast XP update for leaderboard refresh
    if (xpAwarded > 0) {
      broadcastToAll('xp_updated', {
        studentId,
        xp: updatedUser?.xp || 0,
        coins: updatedUser?.coins || 0,
        xpAwarded,
        coinsAwarded,
        totalXp: updatedUser?.xp || 0,
      });
    }

    res.json({
      ok: true,
      attempt: { ...attempt, id: attempt._id.toString() },
      score,
      totalQuestions,
      correctCount,
      passed: score >= 60,
      xpAwarded,
      coinsAwarded,
    });
  } catch (error) {
    console.error('Quiz submit error:', error);
    res.status(500).json({ error: 'Failed to submit quiz' });
  }
});

export default router;
