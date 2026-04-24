/**
 * server/routes/users.js
 * User management routes including bulk import
 */

import express from 'express';
const router = express.Router();
import { ObjectId } from 'mongodb';
import bcrypt from 'bcryptjs';
import { connectToDatabase, COLLECTIONS } from '../db/mongoAtlas.js';
import { authMiddleware } from '../middleware/auth.js';
import { csrfProtection } from '../middleware/security.js';

const serializeUser = (user) => ({
  ...user,
  id: user._id?.toString() || user.id,
  classId: user.classId ? user.classId.toString() : null,
});

const normalizeUserPayload = (user) => {
  const normalized = { ...user };

  delete normalized._id;

  if (normalized.classId === '' || normalized.classId == null) {
    normalized.classId = null;
  } else if (typeof normalized.classId === 'string' && ObjectId.isValid(normalized.classId)) {
    normalized.classId = new ObjectId(normalized.classId);
  }

  normalized.assignedSubjects = Array.isArray(normalized.assignedSubjects) ? normalized.assignedSubjects : [];
  normalized.performance = normalized.performance || [];
  normalized.preferences = normalized.preferences || {};
  normalized.history = normalized.history || [];

  return normalized;
};

// Public endpoint - no auth required
router.get('/', async (req, res) => {
  try {
    const db = await connectToDatabase();
    
    // Parse pagination params
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;
    
    const [users, total] = await Promise.all([
      db.collection(COLLECTIONS.USERS)
        .find({})
        .project({ password: 0 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      db.collection(COLLECTIONS.USERS).countDocuments(),
    ]);
    
    res.json({
      data: users.map(serializeUser),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit), hasMore: page * limit < total },
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

router.post('/bulk', authMiddleware, async (req, res) => {
  try {
    const users = Array.isArray(req.body) ? req.body : req.body?.users;
    if (!Array.isArray(users)) {
      return res.status(400).json({ error: 'Expected array of users' });
    }

    const db = await connectToDatabase();
    const results = { inserted: 0, updated: 0, errors: [] };

    for (const user of users) {
      try {
        const normalizedUser = normalizeUserPayload(user);
        const hasObjectId = typeof user.id === 'string' && ObjectId.isValid(user.id);

        if (hasObjectId) {
          const existing = await db.collection(COLLECTIONS.USERS).findOne({ _id: new ObjectId(user.id) });
          if (existing) {
            await db.collection(COLLECTIONS.USERS).updateOne(
              { _id: new ObjectId(user.id) },
              { $set: { ...normalizedUser, updatedAt: new Date() } }
            );
            results.updated++;
          } else {
            await db.collection(COLLECTIONS.USERS).insertOne({
              ...normalizedUser,
              _id: new ObjectId(),
              createdAt: new Date(),
              updatedAt: new Date(),
              active: user.active ?? true,
              emailVerified: user.emailVerified ?? false,
            });
            results.inserted++;
          }
        } else {
          await db.collection(COLLECTIONS.USERS).insertOne({
            ...normalizedUser,
            _id: new ObjectId(),
            createdAt: new Date(),
            updatedAt: new Date(),
            active: user.active ?? true,
            emailVerified: user.emailVerified ?? false,
          });
          results.inserted++;
        }
      } catch (err) {
        results.errors.push({ user: user.email || user.name, error: err.message });
      }
    }

    res.json({ ok: true, ...results });
  } catch (error) {
    console.error('Bulk import error:', error);
    res.status(500).json({ error: 'Failed to import users' });
  }
});

router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const db = await connectToDatabase();
    const user = await db.collection(COLLECTIONS.USERS).findOne(
      { _id: new ObjectId(req.params.id) },
      { projection: { password: 0 } }
    );
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(serializeUser(user));
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

router.patch('/:id', authMiddleware, async (req, res) => {
  try {
    const db = await connectToDatabase();
    const { password, ...updates } = req.body;
    
    if (password) {
      updates.password = await bcrypt.hash(password, 10);
    }
    
    await db.collection(COLLECTIONS.USERS).updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { ...normalizeUserPayload(updates), updatedAt: new Date() } }
    );
    res.json({ ok: true });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const db = await connectToDatabase();
    await db.collection(COLLECTIONS.USERS).deleteOne({ _id: new ObjectId(req.params.id) });
    res.json({ ok: true });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

router.get('/:id/badges', authMiddleware, async (req, res) => {
  try {
    const db = await connectToDatabase();
    const user = await db.collection(COLLECTIONS.USERS).findOne(
      { _id: new ObjectId(req.params.id) },
      { projection: { badges: 1, name: 1 } }
    );
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ badges: user.badges || [] });
  } catch (error) {
    console.error('Get badges error:', error);
    res.status(500).json({ error: 'Failed to fetch badges' });
  }
});

export default router;
