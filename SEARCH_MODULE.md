================================================================================
e. SEARCH MODULE
================================================================================

// server/routes/search.js
import express from 'express';
const router = express.Router();
import { connectToDatabase, COLLECTIONS } from '../db/mongoAtlas.js';
import { authMiddleware } from '../middleware/auth.js';

// GET /api/search?q=keyword&type=users
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { q, type, page = '1', limit = '20' } = req.query;
    const searchTerm = q?.trim();
    const pageNum = parseInt(page) || 1;
    const limitNum = Math.min(100, parseInt(limit) || 20);

    if (!searchTerm) {
      return res.status(400).json({ error: 'Search query required' });
    }

    const db = await connectToDatabase();
    const filter = {};
    const searchFields = { 
      users: ['name', 'email'],
      notes: ['title', 'content'],
      quizzes: ['title', 'topic'],
      tickets: ['subject', 'message']
    };

    const fields = searchFields[type] || searchFields.users;
    filter.$or = fields.map(f => ({ [f]: { $regex: searchTerm, $options: 'i' } }));

    const collection = type === 'notes' ? COLLECTIONS.CENTRALIZED_NOTES :
                   type === 'quizzes' ? COLLECTIONS.QUIZZES :
                   type === 'tickets' ? COLLECTIONS.TICKETS : COLLECTIONS.USERS;

    const total = await db.collection(collection).countDocuments(filter);
    const data = await db.collection(collection)
      .find(filter)
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .toArray();

    res.json({
      data,
      pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) }
    });
  } catch (error) {
    res.status(500).json({ error: 'Search failed' });
  }
});

// GET /api/search/notes?q=algebra
router.get('/notes', authMiddleware, async (req, res) => {
  try {
    const { q, subjectId, classId } = req.query;
    const db = await connectToDatabase();
    const filter = { deletedAt: null };
    
    if (q) {
      filter.$or = [
        { title: { $regex: q, $options: 'i' } },
        { content: { $regex: q, $options: 'i' } }
      ];
    }
    if (subjectId) filter.subjectId = subjectId;
    if (classId) filter.classId = classId;

    const notes = await db.collection(COLLECTIONS.CENTRALIZED_NOTES).find(filter).toArray();
    res.json({ data: notes });
  } catch (error) {
    res.status(500).json({ error: 'Note search failed' });
  }
});

export default router;