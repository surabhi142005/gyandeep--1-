/**
 * server/routes/questionBank.js
 * Question bank CRUD operations
 */

import express from 'express';
const router = express.Router();
import { ObjectId } from 'mongodb';
import { connectToDatabase, COLLECTIONS } from '../db/mongoAtlas.js';

router.get('/', async (req, res) => {
  try {
    const db = await connectToDatabase();
    const { subject, difficulty, type } = req.query;
    
    const filter = {};
    if (subject) filter.subject = subject;
    if (difficulty) filter.difficulty = difficulty;
    if (type) filter.type = type;

    const questions = await db.collection(COLLECTIONS.QUESTION_BANK)
      .find(filter)
      .sort({ createdAt: -1 })
      .toArray();
    
    res.json(questions.map(q => ({ ...q, id: q._id?.toString() || q.id })));
  } catch (error) {
    console.error('Get questions error:', error);
    res.status(500).json({ error: 'Failed to fetch questions' });
  }
});

router.post('/add', async (req, res) => {
  try {
    const { questions } = req.body;
    if (!Array.isArray(questions)) {
      return res.status(400).json({ error: 'Expected array of questions' });
    }

    const db = await connectToDatabase();
    const docs = questions.map(q => ({
      ...q,
      _id: new ObjectId(),
      createdAt: new Date(),
      updatedAt: new Date(),
      stats: { timesUsed: 0, correctRate: 0 },
    }));

    const result = await db.collection(COLLECTIONS.QUESTION_BANK).insertMany(docs);
    res.json({ ok: true, count: result.insertedCount });
  } catch (error) {
    console.error('Add questions error:', error);
    res.status(500).json({ error: 'Failed to add questions' });
  }
});

router.post('/upsert-quiz', async (req, res) => {
  try {
    const { quiz, subject } = req.body;
    if (!Array.isArray(quiz) || !subject) {
      return res.status(400).json({ error: 'Expected quiz array and subject' });
    }

    const db = await connectToDatabase();
    const now = new Date();

    if (req.body.quizId) {
      await db.collection(COLLECTIONS.QUESTION_BANK).deleteMany({
        quizId: req.body.quizId,
        subject,
      });
    }

    const docs = quiz.map((q, index) => ({
      ...q,
      subject,
      quizId: req.body.quizId,
      orderIndex: index,
      _id: new ObjectId(),
      createdAt: now,
      updatedAt: now,
      stats: q.stats || { timesUsed: 0, correctRate: 0 },
    }));

    const result = await db.collection(COLLECTIONS.QUESTION_BANK).insertMany(docs);
    res.json({ ok: true, count: result.insertedCount });
  } catch (error) {
    console.error('Upsert quiz error:', error);
    res.status(500).json({ error: 'Failed to upsert quiz' });
  }
});

router.post('/update', async (req, res) => {
  try {
    const { id, patch } = req.body;
    if (!id || !patch) {
      return res.status(400).json({ error: 'Question ID and patch data required' });
    }

    const db = await connectToDatabase();
    await db.collection(COLLECTIONS.QUESTION_BANK).updateOne(
      { _id: new ObjectId(id) },
      { $set: { ...patch, updatedAt: new Date() } }
    );
    res.json({ ok: true });
  } catch (error) {
    console.error('Update question error:', error);
    res.status(500).json({ error: 'Failed to update question' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const db = await connectToDatabase();
    const question = await db.collection(COLLECTIONS.QUESTION_BANK).findOne(
      { _id: new ObjectId(req.params.id) }
    );
    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }
    res.json({ ...question, id: question._id.toString() });
  } catch (error) {
    console.error('Get question error:', error);
    res.status(500).json({ error: 'Failed to fetch question' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const db = await connectToDatabase();
    const result = await db.collection(COLLECTIONS.QUESTION_BANK).deleteOne(
      { _id: new ObjectId(req.params.id) }
    );
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Question not found' });
    }
    res.json({ ok: true });
  } catch (error) {
    console.error('Delete question error:', error);
    res.status(500).json({ error: 'Failed to delete question' });
  }
});

export default router;
