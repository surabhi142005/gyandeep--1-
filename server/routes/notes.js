/**
 * server/routes/notes.js
 * Notes management routes
 */

import express from 'express';
const router = express.Router();
import { ObjectId } from 'mongodb';
import { connectToDatabase, COLLECTIONS } from '../db/mongoAtlas.js';
import { authMiddleware } from '../middleware/auth.js';
import { broadcastToAll, broadcastToRoom } from '../services/broadcast.js';

function buildSubjectFilter(subjectId) {
  if (!subjectId) return null;
  return {
    $or: [
      { subjectId },
      { subject: subjectId },
    ],
  };
}

async function resolveSubjectLabel(db, note) {
  if (note.subject) return note.subject;
  if (!note.subjectId) return 'General';
  if (!ObjectId.isValid(note.subjectId)) return note.subjectId;

  const subject = await db.collection(COLLECTIONS.SUBJECTS).findOne(
    { _id: new ObjectId(note.subjectId) },
    { projection: { name: 1 } }
  );

  return subject?.name || note.subjectId;
}

router.get('/', async (req, res) => {
  try {
    const db = await connectToDatabase();
    const { classId, subjectId } = req.query;
    
    // Parse pagination params
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;
    
    const filter = {};
    if (classId) filter.classId = classId;
    if (subjectId) {
      const subjectFilter = buildSubjectFilter(subjectId);
      if (subjectFilter) Object.assign(filter, subjectFilter);
    }

    const [notes, total] = await Promise.all([
      db.collection(COLLECTIONS.SESSION_NOTES)
        .find({ ...filter, deletedAt: null })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      db.collection(COLLECTIONS.SESSION_NOTES).countDocuments({ ...filter, deletedAt: null }),
    ]);
    
    res.json({
      data: notes.map(n => ({ ...n, id: n._id?.toString() || n.id })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit), hasMore: page * limit < total },
    });
  } catch (error) {
    console.error('Get notes error:', error);
    res.status(500).json({ error: 'Failed to fetch notes' });
  }
});

router.post('/upload', authMiddleware, async (req, res) => {
  try {
    const db = await connectToDatabase();
    const { classId, subjectId, content, url, extractedText, fileName, fileType } = req.body;

    // Validate file type - PDF, Images, and Docs allowed
    const allowedTypes = [
      'application/pdf', 
      'text/pdf',
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    if (fileType && !allowedTypes.includes(fileType.toLowerCase())) {
      return res.status(400).json({ error: 'Unsupported file type. Allowed: PDF, Images, Word' });
    }

    // Validate file extension if provided
    const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.webp', '.doc', '.docx'];
    if (fileName && !allowedExtensions.some(ext => fileName.toLowerCase().endsWith(ext))) {
      return res.status(400).json({ error: 'Unsupported file extension' });
    }

    const result = await db.collection(COLLECTIONS.SESSION_NOTES).insertOne({
      classId,
      subjectId,
      subject: subjectId || 'General',
      content: content || extractedText || '',
      url: url || null,
      fileName: fileName || null,
      fileType: fileType || 'application/pdf',
      uploadedBy: req.user?.id || null,
      deletedAt: null,
      _id: new ObjectId(),
      createdAt: new Date(),
    });

    res.json({ ok: true, id: result.insertedId.toString() });
    
    // Broadcast note_uploaded event for real-time updates
    if (classId) {
      broadcastToRoom(`class:${classId}`, 'note_uploaded', {
        id: result.insertedId.toString(),
        classId,
        subjectId,
        fileName,
        fileType,
        uploadedBy: req.user?.id
      });
    } else {
      broadcastToAll('note_uploaded', {
        id: result.insertedId.toString(),
        classId,
        subjectId,
        fileName,
        fileType,
        uploadedBy: req.user?.id
      });
    }
  } catch (error) {
    console.error('Upload note error:', error);
    res.status(500).json({ error: 'Failed to upload note' });
  }
});

router.get('/centralized', authMiddleware, async (req, res) => {
  try {
    const db = await connectToDatabase();
    const { subjectId, unitNumber, classId } = req.query;
    
    const filter = {};
    if (subjectId) {
      const subjectFilter = buildSubjectFilter(subjectId);
      if (subjectFilter) Object.assign(filter, subjectFilter);
    }
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
      subject: subjectId || 'General',
      unitNumber: Number(unitNumber),
      unitName,
      title,
      content,
      noteType: noteType || 'class_notes',
      uploadedBy: req.user?.id || null,
      _id: new ObjectId(),
      createdAt: new Date(),
    });

    res.status(201).json({ ok: true, id: result.insertedId.toString() });
    
    // Broadcast note_uploaded event for real-time updates
    broadcastToAll('note_uploaded', {
      id: result.insertedId.toString(),
      classId,
      subjectId,
      unitNumber,
      title,
      noteType,
      isCentralized: true
    });
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

/**
 * GET /api/notes/student/:classId
 * Get notes for a specific class (student view)
 */
router.get('/student/:classId', authMiddleware, async (req, res) => {
  try {
    const db = await connectToDatabase();
    const { classId } = req.params;
    const { subjectId } = req.query;

    const filter = {
      classId,
      deletedAt: null,
    };
    if (subjectId) {
      const subjectFilter = buildSubjectFilter(subjectId);
      if (subjectFilter) Object.assign(filter, subjectFilter);
    }

    const notes = await db.collection(COLLECTIONS.SESSION_NOTES)
      .find(filter)
      .sort({ createdAt: -1 })
      .toArray();

    const notesWithSubject = await Promise.all(notes.map(async (note) => {
      const subjectName = await resolveSubjectLabel(db, note);
      return {
        id: note._id?.toString() || note.id,
        fileName: note.fileName || null,
        subject: subjectName,
        uploadedAt: note.createdAt,
        fileUrl: note.url || null,
        content: note.content?.slice(0, 200) || null,
      };
    }));

    if (notesWithSubject.length === 0) {
      return res.json({
        notes: [],
        message: 'No notes uploaded yet for this class',
      });
    }

    res.json({
      notes: notesWithSubject,
    });
  } catch (error) {
    console.error('Get student notes error:', error);
    res.status(500).json({ error: 'Failed to get student notes' });
  }
});

export default router;
