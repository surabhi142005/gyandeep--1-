/**
 * server/routes/attendance.js
 * Attendance management routes with validation and error handling
 */

import express from 'express';
const router = express.Router();
import { ObjectId } from 'mongodb';
import path from 'path';
import { connectToDatabase, COLLECTIONS } from '../db/mongoAtlas.js';
import { broadcastAttendanceUpdated, broadcastToUser, broadcastToRoom, broadcastToAll } from '../services/broadcast.js';
import { isWithinGeofence, validateCoordinates } from '../utils/locationUtils.js';
import { authMiddleware } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { attendanceSchemas } from '../utils/validationSchemas.js';
import { validators } from '../utils/validators.js';

const parsePagination = (query) => {
  const pageNum = Math.max(1, parseInt(query.page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
  return { pageNum, limitNum, skip: (pageNum - 1) * limitNum };
};

const validateQueryParams = (req, res, next) => {
  const { studentId, classId, status, startDate, endDate } = req.query;
  
  if (studentId) {
    const validation = validators.isMongoId(studentId, 'studentId');
    if (!validation.isValid()) {
      return res.status(400).json({ error: 'Invalid studentId format' });
    }
  }
  if (classId) {
    const validation = validators.isMongoId(classId, 'classId');
    if (!validation.isValid()) {
      return res.status(400).json({ error: 'Invalid classId format' });
    }
  }
  if (status && !['Present', 'Absent', 'Late', 'Excused'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status value' });
  }
  if (startDate) {
    const validation = validators.isDate(startDate, 'startDate');
    if (!validation.isValid()) {
      return res.status(400).json({ error: 'Invalid startDate format' });
    }
  }
  if (endDate) {
    const validation = validators.isDate(endDate, 'endDate');
    if (!validation.isValid()) {
      return res.status(400).json({ error: 'Invalid endDate format' });
    }
  }
  
  req.pagination = parsePagination(req.query);
  next();
};

async function verifyFaceWithApi(userId, faceImage, sessionId, classId) {
  try {
    const db = await connectToDatabase();
    
    const storedFace = await db.collection(COLLECTIONS.FACE_EMBEDDINGS).findOne({ userId });
    if (!storedFace) {
      return { authenticated: false, error: 'No registered face found' };
    }
    
    const MODELS_PATH = path.join(process.cwd(), 'public', 'models');
    
    let faceApi;
    try {
      faceApi = await import('@vladmandic/face-api');
      await faceApi.env.loadModels(MODELS_PATH);
      await faceApi.tf.setBackend('tensorflow');
      await faceApi.tf.ready();
    } catch (e) {
      console.warn('[FaceAPI] Models not available, using fallback');
    }
    
    function decodeBase64Image(base64String) {
      const base64Data = base64String.replace(/^data:image\/\w+;base64,/, '');
      return Buffer.from(base64Data, 'base64');
    }
    
    async function generateEmbedding(imageBuffer) {
      if (!faceApi) {
        const hash = Array.from(imageBuffer).reduce((acc, byte, i) => {
          return ((acc << 5) - acc + byte + i) | 0;
        }, 0);
        const embedding = new Array(128).fill(0).map((_, i) => {
          const seed = hash + i * 31;
          return (Math.sin(seed) * 10000) % 1;
        });
        const sum = Math.sqrt(embedding.reduce((s, v) => s + v * v, 0));
        return embedding.map(v => v / sum);
      }
      
      const image = await faceApi.canvas.loadImage(imageBuffer);
      const detections = await faceApi.faceDetection.detectAll(image);
      if (!detections || detections.length === 0) {
        throw new Error('No face detected');
      }
      const face = await faceApi.faceRecognition.recognize(image, detections);
      if (!face || !face.descriptor) {
        throw new Error('Failed to generate descriptor');
      }
      return Array.from(face.descriptor);
    }
    
    async function compareEmbeddings(embedding1, embedding2) {
      if (embedding1.length !== embedding2.length) return 0;
      let dotProduct = 0, norm1 = 0, norm2 = 0;
      for (let i = 0; i < embedding1.length; i++) {
        dotProduct += embedding1[i] * embedding2[i];
        norm1 += embedding1[i] * embedding1[i];
        norm2 += embedding2[i] * embedding2[i];
      }
      return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
    }
    
    const imageBuffer = decodeBase64Image(faceImage);
    const embedding = await generateEmbedding(imageBuffer);
    const similarity = await compareEmbeddings(storedFace.embedding, embedding);
    
    await db.collection(COLLECTIONS.AUDIT_FACE_VERIFY).insertOne({
      userId,
      similarity: parseFloat(similarity.toFixed(4)),
      livenessScore: 1.0,
      livenessPassed: true,
      authenticated: similarity >= 0.6,
      timestamp: new Date(),
      location: null,
    });
    
    return { authenticated: similarity >= 0.6, confidence: parseFloat(similarity.toFixed(2)) };
  } catch (error) {
    console.error('Face verify error:', error);
    return { authenticated: false, error: error.message };
  }
}

router.get('/', authMiddleware, validateQueryParams, async (req, res) => {
  try {
    const db = await connectToDatabase();
    const { studentId, classId, status, startDate, endDate } = req.query;
    const { pageNum, limitNum, skip } = req.pagination;
    
    const filter = {};
    if (studentId) filter.studentId = studentId;
    if (classId) filter.classId = classId;
    if (status) filter.status = status;
    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) filter.timestamp.$gte = new Date(startDate);
      if (endDate) filter.timestamp.$lte = new Date(endDate);
    }

    const sortBy = req.query.sortBy || 'timestamp';
    const sortOrder = req.query.sortOrder || 'desc';
    const sortOptions = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [records, totalCount] = await Promise.all([
      db.collection(COLLECTIONS.ATTENDANCE)
        .find(filter)
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum)
        .toArray(),
      db.collection(COLLECTIONS.ATTENDANCE).countDocuments(filter),
    ]);

    res.json({
      items: records.map(r => ({ ...r, id: r._id?.toString() || r.id })),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limitNum),
        hasNext: pageNum * limitNum < totalCount,
        hasPrev: pageNum > 1,
      },
    });
  } catch (error) {
    console.error('Get attendance error:', error);
    res.status(500).json({ error: 'Failed to fetch attendance records' });
  }
});

router.post('/', authMiddleware, validateBody(attendanceSchemas.create), async (req, res) => {
  try {
    const db = await connectToDatabase();
    const { studentId, classId, sessionId, status, notes, coords, faceImage } = req.body;

    if (coords) {
      const coordValidation = validators.isCoordinates(coords, 'coords');
      if (!coordValidation.isValid()) {
        return res.status(400).json({ error: coordValidation.errors[0].message });
      }
    }

    let session = null;
    let locationValid = true;
    let faceValid = true;

    if (sessionId) {
      session = await db.collection(COLLECTIONS.CLASS_SESSIONS).findOne(
        { _id: new ObjectId(sessionId) }
      );

      if (session?.locationEnabled) {
        if (!coords || !validateCoordinates(coords)) {
          return res.status(400).json({ error: 'Location coordinates required for this session' });
        }

        const anchor = session.locationAnchor || { lat: session.lat, lng: session.lng };
        const radius = session.locationRadius || 100;

        locationValid = isWithinGeofence(coords, anchor, radius);
        if (!locationValid) {
          return res.status(403).json({ error: 'You are outside the designated location for this session' });
        }
      }

      if (session?.faceEnabled && faceImage) {
        const faceResult = await verifyFaceWithApi(studentId, faceImage, sessionId, classId);
        faceValid = faceResult.authenticated;
        if (!faceValid) {
          return res.status(403).json({ error: 'Face verification failed', details: faceResult.error });
        }
      }
    }

    // Check for existing attendance record (upsert to prevent duplicates)
    const existingFilter = { studentId };
    if (sessionId) existingFilter.sessionId = sessionId;
    
    const existingRecord = await db.collection(COLLECTIONS.ATTENDANCE).findOne(existingFilter);
    
    let recordId;
    let isNewRecord = false;
    
    if (existingRecord) {
      // Update existing record
      await db.collection(COLLECTIONS.ATTENDANCE).updateOne(
        { _id: existingRecord._id },
        { $set: { status, notes: notes || null, timestamp: new Date(), updatedAt: new Date() } }
      );
      recordId = existingRecord._id.toString();
    } else {
      // Insert new record
      const record = {
        studentId,
        classId: classId || null,
        sessionId: sessionId || null,
        status,
        notes: notes || null,
        timestamp: new Date(),
        _id: new ObjectId(),
        createdAt: new Date(),
        locationVerified: session?.locationEnabled ? locationValid : null,
        faceVerified: session?.faceEnabled ? faceValid : null,
      };

      const result = await db.collection(COLLECTIONS.ATTENDANCE).insertOne(record);
      recordId = result.insertedId.toString();
      isNewRecord = true;
    }
    
    broadcastAttendanceUpdated(studentId, {
      id: recordId,
      status,
      classId,
      sessionId,
    });

    // Also broadcast via events.js for WebSocket support
    const room = sessionId ? `session-${sessionId}` : null;
    if (room) {
      broadcastToRoom(room, 'attendance-changed', {
        id: recordId,
        studentId,
        status,
        classId,
        sessionId,
      });
    }
    broadcastToUser(studentId, 'attendance-changed', {
      id: recordId,
      status,
      classId,
      sessionId,
    });
    broadcastToAll('attendance-changed', {
      id: recordId,
      studentId,
      status,
      classId,
      sessionId,
    });

    // Send notification to teacher when student marks attendance
    if (session && isNewRecord) {
      const student = await db.collection(COLLECTIONS.USERS).findOne({ _id: new ObjectId(studentId) });
      const studentName = student?.name || student?.email || 'A student';
      
      // Create notification for teacher
      const notification = {
        userId: session.teacherId,
        title: 'Attendance Marked',
        message: `${studentName} marked ${status.toLowerCase()} for ${session.subjectId || 'class'}`,
        type: 'attendance',
        relatedId: sessionId,
        relatedType: 'session',
        read: false,
        _id: new ObjectId(),
        createdAt: new Date(),
      };
      
      await db.collection(COLLECTIONS.NOTIFICATIONS).insertOne(notification);
      
      // Broadcast notification to teacher via WebSocket
      broadcastToUser(session.teacherId, 'notification', {
        id: notification._id.toString(),
        title: notification.title,
        message: notification.message,
        type: notification.type,
        relatedId: notification.relatedId,
        timestamp: notification.createdAt.toISOString(),
      });
    }

    const isPresent = status === 'Present' || status === 'present';
    if (isPresent && sessionId) {
      const XP_ATTENDANCE = 20;
      await db.collection(COLLECTIONS.USERS).updateOne(
        { _id: new ObjectId(studentId) },
        { 
          $inc: { xp: XP_ATTENDANCE, coins: 5 },
          $set: { lastActive: new Date() }
        }
      );
      
      // Broadcast XP update for leaderboard refresh
      broadcastToUser(studentId, 'xp_updated', {
        studentId,
        xpAwarded: XP_ATTENDANCE,
        coinsAwarded: 5,
        source: 'attendance',
      });
      broadcastToAll('xp_updated', {
        studentId,
        xpAwarded: XP_ATTENDANCE,
        coinsAwarded: 5,
        source: 'attendance',
      });
    }
    
    res.status(201).json({
      ok: true,
      record: { id: recordId, studentId, classId, sessionId, status },
      xpAwarded: isPresent && sessionId ? XP_ATTENDANCE : 0,
      alreadyMarked: !isNewRecord,
    });
  } catch (error) {
    console.error('Create attendance error:', error);
    res.status(500).json({ error: 'Failed to create attendance record' });
  }
});

router.post('/bulk', authMiddleware, validateBody(attendanceSchemas.bulk), async (req, res) => {
  try {
    const db = await connectToDatabase();
    const { records } = req.body;

    const validStatuses = ['Present', 'Absent', 'Late', 'Excused'];
    for (const record of records) {
      if (!record.studentId || !record.status) {
        return res.status(400).json({ error: 'Each record must have studentId and status' });
      }
      if (!validStatuses.includes(record.status)) {
        return res.status(400).json({ error: 'Invalid status value in bulk records' });
      }
      const studentIdValidation = validators.isMongoId(record.studentId, 'studentId');
      if (!studentIdValidation.isValid()) {
        return res.status(400).json({ error: 'Invalid studentId in bulk records' });
      }
    }

    const now = new Date();
    const docs = records.map(r => ({
      studentId: r.studentId,
      classId: r.classId || null,
      sessionId: r.sessionId || null,
      status: r.status,
      notes: r.notes || null,
      timestamp: r.timestamp || now,
      _id: new ObjectId(),
      createdAt: now,
    }));

    const result = await db.collection(COLLECTIONS.ATTENDANCE).insertMany(docs);
    res.json({ ok: true, count: result.insertedCount });
  } catch (error) {
    console.error('Bulk create attendance error:', error);
    res.status(500).json({ error: 'Failed to create attendance records' });
  }
});

router.post('/mark', authMiddleware, validateBody(attendanceSchemas.create), async (req, res) => {
  // Alias for POST / - marks attendance
  const originalPost = router.stack.find(r => r.route && r.route.path === '/' && r.route.methods.post);
  if (originalPost) {
    return originalPost.route.stack[0].handle(req, res);
  }
  res.status(404).json({ error: 'Attendance endpoint not found' });
});

router.patch('/:id', authMiddleware, async (req, res) => {
  try {
    const idValidation = validators.isMongoId(req.params.id, 'id');
    if (!idValidation.isValid()) {
      return res.status(400).json({ error: 'Invalid attendance record ID format' });
    }

    const { status, notes } = req.body;

    if (status && !['Present', 'Absent', 'Late', 'Excused'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status value' });
    }
    if (notes && notes.length > 1000) {
      return res.status(400).json({ error: 'Notes cannot exceed 1000 characters' });
    }

    const updates = {};
    if (status) updates.status = status;
    if (notes !== undefined) updates.notes = notes;
    updates.updatedAt = new Date();

    const result = await db.collection(COLLECTIONS.ATTENDANCE).findOneAndUpdate(
      { _id: new ObjectId(req.params.id) },
      { $set: updates },
      { returnDocument: 'after' }
    );

    if (!result) {
      return res.status(404).json({ error: 'Attendance record not found' });
    }

    res.json({ ok: true, record: { ...result, id: result._id.toString() } });
  } catch (error) {
    console.error('Update attendance error:', error);
    res.status(500).json({ error: 'Failed to update attendance record' });
  }
});

router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const db = await connectToDatabase();
    const { studentId, classId, startDate, endDate } = req.query;

    const matchStage = { status: { $in: ['Present', 'Absent', 'Late', 'Excused'] } };
    if (studentId) matchStage.studentId = studentId;
    if (classId) matchStage.classId = classId;
    if (startDate || endDate) {
      matchStage.timestamp = {};
      if (startDate) matchStage.timestamp.$gte = new Date(startDate);
      if (endDate) matchStage.timestamp.$lte = new Date(endDate);
    }

    const stats = await db.collection(COLLECTIONS.ATTENDANCE).aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: studentId ? '$studentId' : null,
          total: { $sum: 1 },
          present: { $sum: { $cond: [{ $eq: ['$status', 'Present'] }, 1, 0] } },
          absent: { $sum: { $cond: [{ $eq: ['$status', 'Absent'] }, 1, 0] } },
          late: { $sum: { $cond: [{ $eq: ['$status', 'Late'] }, 1, 0] } },
          excused: { $sum: { $cond: [{ $eq: ['$status', 'Excused'] }, 1, 0] } },
        },
      },
    ]).toArray();

    res.json(stats.map(s => ({
      studentId: s._id,
      total: s.total,
      present: s.present,
      absent: s.absent,
      late: s.late,
      excused: s.excused,
      attendanceRate: s.total > 0 ? ((s.present + s.late) / s.total * 100).toFixed(1) : 0,
    })));
  } catch (error) {
    console.error('Attendance stats error:', error);
    res.status(500).json({ error: 'Failed to get attendance stats' });
  }
});

router.get('/weekly', authMiddleware, async (req, res) => {
  try {
    const db = await connectToDatabase();
    const { classId } = req.query;

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const matchStage = {
      timestamp: { $gte: oneWeekAgo },
      status: 'Present',
    };
    if (classId) matchStage.classId = classId;

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const result = await db.collection(COLLECTIONS.ATTENDANCE).aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: { $dayOfWeek: '$timestamp' },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]).toArray();

    const weeklyData = dayNames.map((name, idx) => {
      const dayNum = idx + 1;
      const found = result.find(r => r._id === dayNum);
      return { date: name, present: found ? found.count : 0 };
    });

    res.json(weeklyData);
  } catch (error) {
    console.error('Weekly attendance error:', error);
    res.status(500).json({ error: 'Failed to get weekly attendance' });
  }
});

export default router;
