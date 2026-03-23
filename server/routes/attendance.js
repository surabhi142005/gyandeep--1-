/**
 * server/routes/attendance.js
 * Attendance management routes with pagination support
 */

import express from 'express';
const router = express.Router();
import { ObjectId } from 'mongodb';
import { connectToDatabase, COLLECTIONS } from '../db/mongoAtlas.js';
import { broadcastAttendanceUpdated } from '../services/broadcast.js';

router.get('/', async (req, res) => {
  try {
    const db = await connectToDatabase();
    const {
      studentId,
      classId,
      status,
      startDate,
      endDate,
      page = '1',
      limit = '20',
      sortBy = 'timestamp',
      sortOrder = 'desc',
    } = req.query;

    const filter = {};
    if (studentId) filter.studentId = studentId;
    if (classId) filter.classId = classId;
    if (status) filter.status = status;
    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) filter.timestamp.$gte = new Date(startDate);
      if (endDate) filter.timestamp.$lte = new Date(endDate);
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;
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

router.post('/', async (req, res) => {
  try {
    const db = await connectToDatabase();
    const { studentId, classId, sessionId, status, notes } = req.body;

    if (!studentId || !status) {
      return res.status(400).json({ error: 'studentId and status are required' });
    }

    const record = {
      studentId,
      classId: classId || null,
      sessionId: sessionId || null,
      status,
      notes: notes || null,
      timestamp: new Date(),
      _id: new ObjectId(),
      createdAt: new Date(),
    };

    const result = await db.collection(COLLECTIONS.ATTENDANCE).insertOne(record);
    
    broadcastAttendanceUpdated(studentId, {
      id: result.insertedId.toString(),
      status,
      classId,
      sessionId,
    });
    
    res.status(201).json({
      ok: true,
      record: { ...record, id: result.insertedId.toString() },
    });
  } catch (error) {
    console.error('Create attendance error:', error);
    res.status(500).json({ error: 'Failed to create attendance record' });
  }
});

router.post('/bulk', async (req, res) => {
  try {
    const db = await connectToDatabase();
    const { records } = req.body;

    if (!Array.isArray(records)) {
      return res.status(400).json({ error: 'Expected array of attendance records' });
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

router.patch('/:id', async (req, res) => {
  try {
    const db = await connectToDatabase();
    const { status, notes } = req.body;

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

router.get('/stats', async (req, res) => {
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

export default router;
