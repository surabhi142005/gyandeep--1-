/**
 * server/routes/admin.js
 * Admin routes including email health check
 */

import express from 'express';
const router = express.Router();
import { ObjectId } from 'mongodb';
import { connectToDatabase, COLLECTIONS } from '../db/mongoAtlas.js';
import { authMiddleware } from '../middleware/auth.js';
import bcrypt from 'bcryptjs';

router.get('/email/health', authMiddleware, async (req, res) => {
  try {
    const emailConfigured = !!(
      process.env.SMTP_HOST ||
      process.env.SENDGRID_API_KEY ||
      process.env.RESEND_API_KEY
    );

    res.json({
      ok: true,
      configured: emailConfigured,
      provider: process.env.SMTP_HOST ? 'smtp' : 
                process.env.SENDGRID_API_KEY ? 'sendgrid' : 
                process.env.RESEND_API_KEY ? 'resend' : 'none',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Email health check error:', error);
    res.status(500).json({ error: 'Failed to check email service' });
  }
});

router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const db = await connectToDatabase();
    
    const [users, classes, grades, tickets] = await Promise.all([
      db.collection(COLLECTIONS.USERS).countDocuments(),
      db.collection(COLLECTIONS.CLASSES).countDocuments(),
      db.collection(COLLECTIONS.GRADES).countDocuments(),
      db.collection(COLLECTIONS.TICKETS).countDocuments({ status: 'open' }),
    ]);

    res.json({
      users,
      classes,
      grades,
      openTickets: tickets,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

router.post('/import-users', authMiddleware, async (req, res) => {
  try {
    const db = await connectToDatabase();
    const { users, defaultPassword } = req.body;

    if (!Array.isArray(users) || users.length === 0) {
      return res.status(400).json({ error: 'Users array is required' });
    }

    const defaultPass = defaultPassword || 'Gyandeep@2024';
    const hashedPassword = await bcrypt.hash(defaultPass, 12);
    
    const now = new Date();
    const userDocs = [];
    const errors = [];

    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      try {
        if (!user.name || !user.email) {
          errors.push({ row: i + 1, error: 'Name and email are required' });
          continue;
        }

        const existing = await db.collection(COLLECTIONS.USERS).findOne({ email: user.email });
        if (existing) {
          errors.push({ row: i + 1, error: 'Email already exists', email: user.email });
          continue;
        }

        userDocs.push({
          name: user.name,
          email: user.email,
          password: hashedPassword,
          role: user.role || 'student',
          classId: user.classId || null,
          assignedSubjects: user.assignedSubjects || [],
          active: true,
          emailVerified: false,
          preferences: {},
          history: [],
          performance: [],
          xp: 0,
          level: 1,
          coins: 0,
          badges: [],
          streak: 0,
          createdAt: now,
          updatedAt: now,
        });
      } catch (err) {
        errors.push({ row: i + 1, error: err.message });
      }
    }

    let insertedCount = 0;
    if (userDocs.length > 0) {
      const result = await db.collection(COLLECTIONS.USERS).insertMany(userDocs);
      insertedCount = result.insertedCount;
    }

    res.json({
      ok: true,
      imported: insertedCount,
      errors: errors.length > 0 ? errors : undefined,
      message: `Successfully imported ${insertedCount} users${errors.length > 0 ? `, ${errors.length} errors` : ''}`,
    });
  } catch (error) {
    console.error('Import users error:', error);
    res.status(500).json({ error: 'Failed to import users' });
  }
});

router.post('/import-users/csv', authMiddleware, async (req, res) => {
  try {
    const db = await connectToDatabase();
    const { csvData, defaultPassword } = req.body;

    if (!csvData || typeof csvData !== 'string') {
      return res.status(400).json({ error: 'csvData string is required' });
    }

    const lines = csvData.trim().split('\n');
    if (lines.length < 2) {
      return res.status(400).json({ error: 'CSV must have header row and at least one data row' });
    }

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const nameIdx = headers.findIndex(h => h === 'name');
    const emailIdx = headers.findIndex(h => h === 'email');
    const roleIdx = headers.findIndex(h => h === 'role');
    const classIdx = headers.findIndex(h => h === 'classid' || h === 'class_id');

    if (nameIdx === -1 || emailIdx === -1) {
      return res.status(400).json({ error: 'CSV must have "name" and "email" columns' });
    }

    const defaultPass = defaultPassword || 'Gyandeep@2024';
    const hashedPassword = await bcrypt.hash(defaultPass, 12);
    const now = new Date();
    const userDocs = [];
    const errors = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      try {
        const name = values[nameIdx];
        const email = values[emailIdx];
        
        if (!name || !email) {
          errors.push({ row: i + 1, error: 'Name and email are required' });
          continue;
        }

        const existing = await db.collection(COLLECTIONS.USERS).findOne({ email });
        if (existing) {
          errors.push({ row: i + 1, error: 'Email already exists', email });
          continue;
        }

        userDocs.push({
          name,
          email,
          password: hashedPassword,
          role: roleIdx !== -1 ? (values[roleIdx] || 'student') : 'student',
          classId: classIdx !== -1 ? (values[classIdx] || null) : null,
          assignedSubjects: [],
          active: true,
          emailVerified: false,
          preferences: {},
          history: [],
          performance: [],
          xp: 0,
          level: 1,
          coins: 0,
          badges: [],
          streak: 0,
          createdAt: now,
          updatedAt: now,
        });
      } catch (err) {
        errors.push({ row: i + 1, error: err.message });
      }
    }

    let insertedCount = 0;
    if (userDocs.length > 0) {
      const result = await db.collection(COLLECTIONS.USERS).insertMany(userDocs);
      insertedCount = result.insertedCount;
    }

    res.json({
      ok: true,
      imported: insertedCount,
      errors: errors.length > 0 ? errors : undefined,
      message: `Successfully imported ${insertedCount} users from CSV${errors.length > 0 ? `, ${errors.length} errors` : ''}`,
    });
  } catch (error) {
    console.error('Import CSV users error:', error);
    res.status(500).json({ error: 'Failed to import users from CSV' });
  }
});

export default router;
