/**
 * server/routes/sessions.js
 * Class session routes with real-time quiz support
 */

import express from 'express';
const router = express.Router();
import { ObjectId } from 'mongodb';
import { connectToDatabase, COLLECTIONS } from '../db/mongoAtlas.js';
import { broadcastToRoom, broadcastToAll } from './events.js';

router.get('/', async (req, res) => {
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

router.post('/', async (req, res) => {
  try {
    const db = await connectToDatabase();
    const { teacherId, classId, subjectId, code } = req.body;

    if (!teacherId || !subjectId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const sessionCode = code || `SESSION-${Date.now().toString(36).toUpperCase()}`;
    const expiry = new Date(Date.now() + 4 * 60 * 60 * 1000);

    const result = await db.collection(COLLECTIONS.CLASS_SESSIONS).insertOne({
      teacherId,
      classId: classId || null,
      subjectId,
      code: sessionCode,
      sessionStatus: 'waiting',
      expiry,
      _id: new ObjectId(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

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

router.post('/:id/quiz/start', async (req, res) => {
  try {
    const db = await connectToDatabase();
    const sessionId = req.params.id;
    const { questions, title } = req.body;
    const room = `session-${sessionId}`;

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
    const { studentId, status } = req.body;
    const room = `session-${sessionId}`;

    const attendance = {
      sessionId: new ObjectId(sessionId),
      studentId,
      status: status || 'present',
      markedAt: new Date(),
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

export default router;
