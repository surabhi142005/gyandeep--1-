/**
 * server/middleware/upload.js
 * Multipart file upload handling
 */

import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import { ObjectId } from 'mongodb';
import { connectToDatabase, COLLECTIONS } from '../db/mongoAtlas.js';

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedMimes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
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
};

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024,
    files: 5,
  },
  fileFilter,
});

const uploadSingle = upload.single('file');

const uploadMultiple = upload.array('files', 5);

function handleSingleUpload(req, res, next) {
  uploadSingle(req, res, async (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ error: 'File too large. Maximum size is 50MB.' });
      }
      return res.status(400).json({ error: err.message });
    } else if (err) {
      return res.status(400).json({ error: err.message });
    }
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    next();
  });
}

function handleMultipleUpload(req, res, next) {
  uploadMultiple(req, res, async (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ error: 'One or more files too large. Maximum size is 50MB.' });
      }
      if (err.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({ error: 'Too many files. Maximum is 5.' });
      }
      return res.status(400).json({ error: err.message });
    } else if (err) {
      return res.status(400).json({ error: err.message });
    }
    
    next();
  });
}

async function processNoteUpload(req, res) {
  try {
    const { classId, subjectId, type } = req.body;
    const file = req.file;
    
    if (!file) {
      return res.status(400).json({ error: 'No file provided' });
    }
    
    const timestamp = Date.now();
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const key = `notes/${classId || 'shared'}/${subjectId}/${timestamp}-${safeName}`;
    
    const { uploadFile } = await import('./storage.js');
    const result = await uploadFile(file.buffer, key, file.mimetype);
    
    const db = await connectToDatabase();
    const now = new Date();
    
    const note = {
      classId: classId || null,
      subjectId,
      title: file.originalname,
      url: result.url,
      key: result.key,
      fileName: file.originalname,
      fileSize: file.size,
      mimeType: file.mimetype,
      noteType: type || 'class_notes',
      uploadedBy: req.body.userId || null,
      deletedAt: null,
      _id: new ObjectId(),
      createdAt: now,
      updatedAt: now,
    };
    
    await db.collection(COLLECTIONS.SESSION_NOTES).insertOne(note);
    
    res.json({
      ok: true,
      id: note._id.toString(),
      url: result.url,
      fileName: file.originalname,
      fileSize: file.size,
    });
  } catch (error) {
    console.error('Note upload error:', error);
    res.status(500).json({ error: 'Failed to upload note' });
  }
}

async function processNoteUploadWithExtraction(req, res) {
  try {
    const { classId, subjectId, type } = req.body;
    const file = req.file;
    
    if (!file) {
      return res.status(400).json({ error: 'No file provided' });
    }
    
    let extractedText = '';
    if (file.mimetype === 'text/plain') {
      extractedText = file.buffer.toString('utf-8').slice(0, 50000);
    }
    
    const timestamp = Date.now();
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const key = `notes/${classId || 'shared'}/${subjectId}/${timestamp}-${safeName}`;
    
    const { uploadFile } = await import('./storage.js');
    const result = await uploadFile(file.buffer, key, file.mimetype);
    
    const db = await connectToDatabase();
    const now = new Date();
    
    const note = {
      classId: classId || null,
      subjectId,
      title: file.originalname,
      content: extractedText,
      url: result.url,
      key: result.key,
      fileName: file.originalname,
      fileSize: file.size,
      mimeType: file.mimetype,
      noteType: type || 'class_notes',
      uploadedBy: req.body.userId || null,
      deletedAt: null,
      _id: new ObjectId(),
      createdAt: now,
      updatedAt: now,
    };
    
    await db.collection(COLLECTIONS.SESSION_NOTES).insertOne(note);
    
    res.json({
      ok: true,
      id: note._id.toString(),
      url: result.url,
      fileName: file.originalname,
      fileSize: file.size,
      extractedText: extractedText ? extractedText.slice(0, 500) + '...' : null,
    });
  } catch (error) {
    console.error('Note upload with extraction error:', error);
    res.status(500).json({ error: 'Failed to upload note' });
  }
}

export {
  upload,
  uploadSingle,
  uploadMultiple,
  handleSingleUpload,
  handleMultipleUpload,
  processNoteUpload,
  processNoteUploadWithExtraction,
};
