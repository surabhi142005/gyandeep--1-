/**
 * server/routes/storage.js
 * File storage routes with multipart upload
 */

import express from 'express';
const router = express.Router();
import multer from 'multer';
import { ObjectId } from 'mongodb';
import { connectToDatabase, COLLECTIONS } from '../db/mongoAtlas.js';
import { authMiddleware } from '../middleware/auth.js';
import { broadcast } from '../websocket.js';

function normalizeDateInput(value, fallback = new Date()) {
  if (!value) return fallback;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

const multerStorage = multer.memoryStorage();

const upload = multer({
  storage: multerStorage,
  limits: {
    fileSize: 50 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} is not allowed`), false);
    }
  },
});

const singleUpload = upload.single('file');

function handleUpload(req, res, next) {
  singleUpload(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ error: 'File too large. Maximum size is 50MB.' });
      }
      return res.status(400).json({ error: err.message });
    } else if (err) {
      return res.status(400).json({ error: err.message });
    }
    next();
  });
}

router.post('/upload', authMiddleware, handleUpload, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { classId, subjectId, type, userId } = req.body;
    const noteDate = normalizeDateInput(req.body.noteDate);
    const file = req.file;

    const R2_CONFIGURED = !!(process.env.R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID);
    const CLOUDINARY_CONFIGURED = !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);

    let result;
    if (R2_CONFIGURED) {
      console.log('[Storage] Using Cloudflare R2');
      const { uploadFile } = await import('../lib/storage.js');
      const timestamp = Date.now();
      const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
      const key = `uploads/${classId || 'shared'}/${subjectId || 'general'}/${timestamp}-${safeName}`;
      
      result = await uploadFile(file.buffer, key, file.mimetype);
      
      const db = await connectToDatabase();
      const note = {
        classId: classId || null,
        subjectId: subjectId || null,
        subject: subjectId || 'General',
        title: file.originalname,
        url: result.url,
        key: result.key,
        fileName: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
        noteType: type || 'class_notes',
        uploadedBy: userId || req.user?.id || null,
        deletedAt: null,
        _id: new ObjectId(),
        createdAt: new Date(),
        updatedAt: new Date(),
        noteDate,
      };
      
      await db.collection(COLLECTIONS.SESSION_NOTES).insertOne(note);
      
      broadcast('note_uploaded', {
        id: note._id.toString(),
        title: note.title,
        subject: note.subject,
        url: note.url,
        noteDate,
      }, classId ? `class:${classId}` : null);

      return res.json({
        ok: true,
        id: note._id.toString(),
        url: result.url,
        fileName: file.originalname,
        fileSize: file.size,
      });
    } else if (CLOUDINARY_CONFIGURED) {
      console.log('[Storage] Using Cloudinary');
      const { uploadFile } = await import('../lib/storage.js');
      const timestamp = Date.now();
      const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
      const key = `uploads/${classId || 'shared'}/${subjectId || 'general'}/${timestamp}-${safeName}`;
      
      result = await uploadFile(file.buffer, key, file.mimetype);
      
      const db = await connectToDatabase();
      const note = {
        classId: classId || null,
        subjectId: subjectId || null,
        subject: subjectId || 'General',
        title: file.originalname,
        url: result.url,
        key: result.publicId,
        fileName: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
        noteType: type || 'class_notes',
        uploadedBy: userId || req.user?.id || null,
        deletedAt: null,
        storage: 'cloudinary',
        _id: new ObjectId(),
        createdAt: new Date(),
        updatedAt: new Date(),
        noteDate,
      };
      
      await db.collection(COLLECTIONS.SESSION_NOTES).insertOne(note);
      
      broadcast('note_uploaded', {
        id: note._id.toString(),
        title: note.title,
        subject: note.subject,
        url: note.url,
        noteDate,
      }, classId ? `class:${classId}` : null);

      return res.json({
        ok: true,
        id: note._id.toString(),
        url: result.url,
        fileName: file.originalname,
        fileSize: file.size,
      });
    }

    console.log('[Storage] Falling back to base64');
    const base64 = file.buffer.toString('base64');
    const dataUrl = `data:${file.mimetype};base64,${base64}`;
    
    const db = await connectToDatabase();
    const note = {
      classId: classId || null,
      subjectId: subjectId || null,
      subject: subjectId || 'General',
      title: file.originalname,
      content: base64,
      url: dataUrl,
      fileName: file.originalname,
      fileSize: file.size,
      mimeType: file.mimetype,
      noteType: type || 'class_notes',
      uploadedBy: userId || req.user?.id || null,
      deletedAt: null,
      storage: 'base64',
      _id: new ObjectId(),
      createdAt: new Date(),
      updatedAt: new Date(),
      noteDate,
    };
    
    await db.collection(COLLECTIONS.SESSION_NOTES).insertOne(note);
    
    broadcast('note_uploaded', {
      id: note._id.toString(),
      title: note.title,
      subject: note.subject,
      url: dataUrl,
      noteDate,
    }, classId ? `class:${classId}` : null);

    res.json({
      ok: true,
      id: note._id.toString(),
      url: dataUrl,
      fileName: file.originalname,
      fileSize: file.size,
      storageWarning: 'Using local storage. Configure Cloudinary for production.',
    });
  } catch (error) {
    console.error('Upload error details:', error);
    res.status(500).json({ error: 'Failed to upload file', details: error.message });
  }
});

router.post('/centralized', authMiddleware, handleUpload, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { classId, subjectId, unitNumber, unitName, title, content, noteType, userId } = req.body;
    const noteDate = normalizeDateInput(req.body.noteDate);
    const file = req.file;

    const base64 = file.buffer.toString('base64');
    const dataUrl = `data:${file.mimetype};base64,${base64}`;
    
    const db = await connectToDatabase();
    const note = {
      classId: classId || null,
      subjectId,
      subject: subjectId || 'General',
      unitNumber: parseInt(unitNumber) || 1,
      unitName: unitName || 'Unit',
      title: title || file.originalname,
      content: content || '',
      url: dataUrl,
      fileName: file.originalname,
      fileSize: file.size,
      mimeType: file.mimetype,
      noteType: noteType || 'centralized_notes',
      uploadedBy: userId || req.user?.id || null,
      _id: new ObjectId(),
      createdAt: new Date(),
      noteDate,
    };
    
    await db.collection(COLLECTIONS.CENTRALIZED_NOTES).insertOne(note);
    
    broadcast('centralized_note_uploaded', {
      id: note._id.toString(),
      title: note.title,
      subjectId: note.subjectId,
      noteDate,
    }, classId ? `class:${classId}` : null);

    res.status(201).json({
      ok: true,
      id: note._id.toString(),
      url: dataUrl,
      fileName: file.originalname,
      fileSize: file.size,
    });
  } catch (error) {
    console.error('Centralized upload error:', error);
    res.status(500).json({ error: 'Failed to upload file', details: error.message });
  }
});

// New endpoint for centralized text-only notes
router.post('/centralized-text', authMiddleware, async (req, res) => {
  try {
    const { classId, subjectId, title, content, unitNumber, unitName, userId } = req.body;
    const noteDate = normalizeDateInput(req.body.noteDate);

    if (!title || !content || !subjectId) {
      return res.status(400).json({ error: 'Title, content, and subjectId are required' });
    }

    const db = await connectToDatabase();
    const note = {
      classId: classId || null,
      subjectId,
      subject: subjectId,
      unitNumber: parseInt(unitNumber) || 1,
      unitName: unitName || 'Unit',
      title,
      content,
      url: null,
      noteType: 'centralized_notes',
      uploadedBy: userId || req.user?.id || null,
      _id: new ObjectId(),
      createdAt: new Date(),
      updatedAt: new Date(),
      noteDate,
    };

    await db.collection(COLLECTIONS.CENTRALIZED_NOTES).insertOne(note);

    broadcast('centralized_note_uploaded', {
      id: note._id.toString(),
      title: note.title,
      subjectId: note.subjectId,
      noteDate,
    }, classId ? `class:${classId}` : null);

    res.status(201).json({
      ok: true,
      id: note._id.toString(),
      message: 'Text note saved to centralized bank',
    });
  } catch (error) {
    console.error('Centralized text note error:', error);
    res.status(500).json({ error: 'Failed to save centralized note' });
  }
});

router.post('/profile', authMiddleware, handleUpload, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    if (!req.file.mimetype.startsWith('image/')) {
      return res.status(400).json({ error: 'Only images are allowed for profile pictures' });
    }

    const base64 = req.file.buffer.toString('base64');
    const dataUrl = `data:${req.file.mimetype};base64,${base64}`;
    
    const db = await connectToDatabase();
    await db.collection(COLLECTIONS.USERS).updateOne(
      { _id: new ObjectId(userId) },
      { $set: { faceImage: dataUrl, updatedAt: new Date() } }
    );
    
    res.json({
      ok: true,
      url: dataUrl,
      message: 'Profile image updated',
    });
  } catch (error) {
    console.error('Profile upload error:', error);
    res.status(500).json({ error: 'Failed to upload profile image' });
  }
});

router.get('/storage-status', (req, res) => {
  const R2_CONFIGURED = !!(process.env.R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID);
  const BACKBLAZE_CONFIGURED = !!(process.env.B2_ACCESS_KEY && process.env.B2_SECRET_KEY);
  const CLOUDINARY_CONFIGURED = !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY);
  
  let provider = 'none';
  if (R2_CONFIGURED) provider = 'cloudflare-r2';
  else if (BACKBLAZE_CONFIGURED) provider = 'backblaze-b2';
  else if (CLOUDINARY_CONFIGURED) provider = 'cloudinary';
  
  res.json({
    configured: R2_CONFIGURED || BACKBLAZE_CONFIGURED || CLOUDINARY_CONFIGURED,
    provider,
    message: (R2_CONFIGURED || BACKBLAZE_CONFIGURED || CLOUDINARY_CONFIGURED)
      ? 'Cloud storage is configured'
      : 'Using local storage. Configure Cloudinary, R2, or Backblaze for production.',
  });
});

export default router;
