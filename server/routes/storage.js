/**
 * server/routes/storage.js
 * File storage routes with multipart upload
 */

import express from 'express';
const router = express.Router();
import multer from 'multer';
import { ObjectId } from 'mongodb';
import { connectToDatabase, COLLECTIONS } from '../db/mongoAtlas.js';

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

router.post('/upload', handleUpload, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { classId, subjectId, type, userId } = req.body;
    const file = req.file;

    const R2_CONFIGURED = process.env.R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID;

    if (R2_CONFIGURED) {
      const { uploadFile } = await import('../lib/storage.js');
      const timestamp = Date.now();
      const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
      const key = `uploads/${classId || 'shared'}/${subjectId || 'general'}/${timestamp}-${safeName}`;
      
      const result = await uploadFile(file.buffer, key, file.mimetype);
      
      const db = await connectToDatabase();
      const note = {
        classId: classId || null,
        subjectId: subjectId || null,
        title: file.originalname,
        url: result.url,
        key: result.key,
        fileName: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
        noteType: type || 'class_notes',
        uploadedBy: userId || null,
        deletedAt: null,
        _id: new ObjectId(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      await db.collection(COLLECTIONS.SESSION_NOTES).insertOne(note);
      
      return res.json({
        ok: true,
        id: note._id.toString(),
        url: result.url,
        fileName: file.originalname,
        fileSize: file.size,
      });
    }

    const base64 = file.buffer.toString('base64');
    const dataUrl = `data:${file.mimetype};base64,${base64}`;
    
    const db = await connectToDatabase();
    const note = {
      classId: classId || null,
      subjectId: subjectId || null,
      title: file.originalname,
      content: base64,
      url: dataUrl,
      fileName: file.originalname,
      fileSize: file.size,
      mimeType: file.mimetype,
      noteType: type || 'class_notes',
      uploadedBy: userId || null,
      deletedAt: null,
      storage: 'base64',
      _id: new ObjectId(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    await db.collection(COLLECTIONS.SESSION_NOTES).insertOne(note);
    
    res.json({
      ok: true,
      id: note._id.toString(),
      url: dataUrl,
      fileName: file.originalname,
      fileSize: file.size,
      storageWarning: 'Using local storage. Configure R2 for production.',
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

router.post('/centralized', handleUpload, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { classId, subjectId, unitNumber, unitName, title, content, noteType, userId } = req.body;
    const file = req.file;

    const base64 = file.buffer.toString('base64');
    const dataUrl = `data:${file.mimetype};base64,${base64}`;
    
    const db = await connectToDatabase();
    const note = {
      classId: classId || null,
      subjectId,
      unitNumber: parseInt(unitNumber) || 1,
      unitName: unitName || 'Unit',
      title: title || file.originalname,
      content: content || '',
      url: dataUrl,
      fileName: file.originalname,
      fileSize: file.size,
      mimeType: file.mimetype,
      noteType: noteType || 'centralized_notes',
      uploadedBy: userId || null,
      _id: new ObjectId(),
      createdAt: new Date(),
    };
    
    await db.collection(COLLECTIONS.CENTRALIZED_NOTES).insertOne(note);
    
    res.status(201).json({
      ok: true,
      id: note._id.toString(),
      url: dataUrl,
      fileName: file.originalname,
      fileSize: file.size,
    });
  } catch (error) {
    console.error('Centralized upload error:', error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

router.post('/profile', handleUpload, async (req, res) => {
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
  
  res.json({
    configured: R2_CONFIGURED || BACKBLAZE_CONFIGURED,
    provider: R2_CONFIGURED ? 'cloudflare-r2' : BACKBLAZE_CONFIGURED ? 'backblaze-b2' : 'none',
    message: R2_CONFIGURED || BACKBLAZE_CONFIGURED 
      ? 'Cloud storage is configured' 
      : 'Using local storage. Configure R2 or Backblaze for production.',
  });
});

export default router;
