/**
 * server/routes/timetable.js
 * Timetable management routes
 */

import express from 'express';
const router = express.Router();
import { ObjectId } from 'mongodb';
import { connectToDatabase, COLLECTIONS } from '../db/mongoAtlas.js';
import { authMiddleware } from '../middleware/auth.js';
import { broadcastToAll } from '../services/broadcast.js';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_NAME_TO_INDEX = DAY_NAMES.reduce((acc, day, index) => ({ ...acc, [day]: index }), {});

function resolveDayName(entry) {
  if (entry?.day && typeof entry.day === 'string') return entry.day;
  const index = Number(entry?.dayOfWeek);
  return Number.isInteger(index) && index >= 0 && index < DAY_NAMES.length ? DAY_NAMES[index] : 'Monday';
}

function normalizeTimetableEntry(entry) {
  const day = resolveDayName(entry);
  const dayOfWeek = entry?.dayOfWeek ?? DAY_NAME_TO_INDEX[day] ?? 1;
  return {
    ...entry,
    day,
    dayOfWeek,
    id: entry._id?.toString() || entry.id,
  };
}

function sortTimetableEntries(entries) {
  return [...entries].sort((a, b) => {
    const aDay = Number.isFinite(Number(a.dayOfWeek)) ? Number(a.dayOfWeek) : (DAY_NAME_TO_INDEX[resolveDayName(a)] ?? 99);
    const bDay = Number.isFinite(Number(b.dayOfWeek)) ? Number(b.dayOfWeek) : (DAY_NAME_TO_INDEX[resolveDayName(b)] ?? 99);
    if (aDay !== bDay) return aDay - bDay;
    if (String(a.startTime || '') !== String(b.startTime || '')) {
      return String(a.startTime || '').localeCompare(String(b.startTime || ''));
    }
    return String(a.endTime || '').localeCompare(String(b.endTime || ''));
  });
}

function normalizeTimetablePayload(payload) {
  return Array.isArray(payload) ? payload.map(normalizeTimetableEntry) : [];
}

function prepareTimetablePayload(body) {
  const day = resolveDayName(body);
  return {
    ...body,
    day,
    dayOfWeek: Number.isFinite(Number(body.dayOfWeek)) ? Number(body.dayOfWeek) : (DAY_NAME_TO_INDEX[day] ?? 1),
  };
}

router.get('/', authMiddleware, async (req, res) => {
  try {
    const db = await connectToDatabase();
    const { classId, dayOfWeek, day } = req.query;
    
    const filter = {};
    if (classId) filter.classId = classId;
    if (dayOfWeek !== undefined) {
      const parsedDay = Number(dayOfWeek);
      filter.dayOfWeek = Number.isNaN(parsedDay) ? dayOfWeek : parsedDay;
    }
    if (day) filter.day = day;

    const entries = await db.collection(COLLECTIONS.TIMETABLE)
      .find(filter)
      .toArray();
    
    res.json(sortTimetableEntries(normalizeTimetablePayload(entries)));
  } catch (error) {
    console.error('Get timetable error:', error);
    res.status(500).json({ error: 'Failed to fetch timetable' });
  }
});

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { entries } = req.body;
    if (!Array.isArray(entries)) {
      return res.status(400).json({ error: 'Expected array of timetable entries' });
    }

    const db = await connectToDatabase();
    const now = new Date();

    if (entries[0]?.classId) {
      await db.collection(COLLECTIONS.TIMETABLE).deleteMany({
        classId: entries[0].classId,
      });
    }

    const docs = entries.map(entry => ({
      ...prepareTimetablePayload(entry),
      _id: new ObjectId(),
      createdAt: now,
      updatedAt: now,
    }));

    if (docs.length > 0) {
      await db.collection(COLLECTIONS.TIMETABLE).insertMany(docs);
    }

    broadcastToAll('timetable-changed', { count: docs.length });
    res.json({ ok: true, count: docs.length });
  } catch (error) {
    console.error('Save timetable error:', error);
    res.status(500).json({ error: 'Failed to save timetable' });
  }
});

router.post('/entry', authMiddleware, async (req, res) => {
  try {
    const db = await connectToDatabase();
    const now = new Date();

    const result = await db.collection(COLLECTIONS.TIMETABLE).insertOne({
      ...prepareTimetablePayload(req.body),
      _id: new ObjectId(),
      createdAt: now,
      updatedAt: now,
    });

    broadcastToAll('timetable-changed', { type: 'added', entryId: result.insertedId.toString() });
    res.json({ ok: true, entry: { ...prepareTimetablePayload(req.body), id: result.insertedId.toString() } });
  } catch (error) {
    console.error('Add timetable entry error:', error);
    res.status(500).json({ error: 'Failed to add entry' });
  }
});

router.patch('/:id', authMiddleware, async (req, res) => {
  try {
    const db = await connectToDatabase();
    const updates = prepareTimetablePayload(req.body);
    await db.collection(COLLECTIONS.TIMETABLE).updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { ...updates, updatedAt: new Date() } }
    );
    broadcastToAll('timetable-changed', { type: 'updated', entryId: req.params.id });
    res.json({ ok: true, entry: { ...updates, id: req.params.id } });
  } catch (error) {
    console.error('Update timetable entry error:', error);
    res.status(500).json({ error: 'Failed to update entry' });
  }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const db = await connectToDatabase();
    const result = await db.collection(COLLECTIONS.TIMETABLE).deleteOne(
      { _id: new ObjectId(req.params.id) }
    );
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Entry not found' });
    }
    broadcastToAll('timetable-changed', { type: 'deleted', entryId: req.params.id });
    res.json({ ok: true });
  } catch (error) {
    console.error('Delete timetable entry error:', error);
    res.status(500).json({ error: 'Failed to delete entry' });
  }
});

export default router;
