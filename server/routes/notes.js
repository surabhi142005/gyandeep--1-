/**
 * server/routes/notes.js
 * Notes management routes
 */

import express from 'express';
const router = express.Router();
import { ObjectId } from 'mongodb';
import { connectToDatabase, COLLECTIONS } from '../db/mongoAtlas.js';
import { authMiddleware } from '../middleware/auth.js';

router.get('/', authMiddleware, async (req, res) => {
  try {
    const db = await connectToDatabase();
    const { classId, subjectId } = req.query;
    
    const filter = {};
    if (classId) filter.classId = classId;
    if (subjectId) filter.subjectId = subjectId;

    const notes = await db.collection(COLLECTIONS.SESSION_NOTES)
      .find({ ...filter, deletedAt: null })
      .sort({ createdAt: -1 })
      .toArray();
    res.json(notes.map(n => ({ ...n, id: n._id?.toString() || n.id })));
  } catch (error) {
    console.error('Get notes error:', error);
    res.status(500).json({ error: 'Failed to fetch notes' });
  }
});

router.post('/upload', authMiddleware, async (req, res) => {
  try {
    const db = await connectToDatabase();
    const { classId, subjectId, content, url, extractedText, fileName, fileType } = req.body;

    // Validate file type - only PDF allowed
    const allowedTypes = ['application/pdf', 'text/pdf'];
    if (fileType && !allowedTypes.includes(fileType.toLowerCase())) {
      return res.status(400).json({ error: 'Only PDF files are allowed' });
    }

    // Validate file extension if provided
    if (fileName && !fileName.toLowerCase().endsWith('.pdf')) {
      return res.status(400).json({ error: 'Only PDF files are allowed' });
    }

    const result = await db.collection(COLLECTIONS.SESSION_NOTES).insertOne({
      classId,
      subjectId,
      content: content || extractedText || '',
      url: url || null,
      fileName: fileName || null,
      fileType: fileType || 'application/pdf',
      deletedAt: null,
      _id: new ObjectId(),
      createdAt: new Date(),
    });

    res.json({ ok: true, id: result.insertedId.toString() });
  } catch (error) {
    console.error('Upload note error:', error);
    res.status(500).json({ error: 'Failed to upload note' });
  }
});

router.get('/centralized', authMiddleware, async (req, res) => {
  try {
    const db = await connectToDatabase();
    const { subjectId, unitNumber, classId } = req.query;
    
    const filter = { subjectId };
    if (unitNumber) filter.unitNumber = Number(unitNumber);
    if (classId) filter.classId = classId;

    const notes = await db.collection(COLLECTIONS.CENTRALIZED_NOTES)
      .find(filter)
      .sort({ unitNumber: 1, createdAt: 1 })
      .toArray();
    res.json(notes.map(n => ({ ...n, id: n._id?.toString() || n.id })));
  } catch (error) {
    console.error('Get centralized notes error:', error);
    res.status(500).json({ error: 'Failed to fetch notes' });
  }
});

router.post('/centralized', authMiddleware, async (req, res) => {
  try {
    const db = await connectToDatabase();
    const { classId, subjectId, unitNumber, unitName, title, content, noteType } = req.body;

    const result = await db.collection(COLLECTIONS.CENTRALIZED_NOTES).insertOne({
      classId: classId || null,
      subjectId,
      unitNumber: Number(unitNumber),
      unitName,
      title,
      content,
      noteType: noteType || 'class_notes',
      _id: new ObjectId(),
      createdAt: new Date(),
    });

    res.status(201).json({ ok: true, id: result.insertedId.toString() });
  } catch (error) {
    console.error('Create centralized note error:', error);
    res.status(500).json({ error: 'Failed to create note' });
  }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const db = await connectToDatabase();
    await db.collection(COLLECTIONS.SESSION_NOTES).updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { deletedAt: new Date() } }
    );
    res.json({ ok: true });
  } catch (error) {
    console.error('Delete note error:', error);
    res.status(500).json({ error: 'Failed to delete note' });
  }
});

export default router;
