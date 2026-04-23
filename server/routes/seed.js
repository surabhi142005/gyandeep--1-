/**
 * server/routes/seed.js
 * Database seeding endpoint
 */

import express from 'express';
const router = express.Router();
import bcrypt from 'bcryptjs';
import { connectToDatabase, COLLECTIONS } from '../db/mongoAtlas.js';

const SALT_ROUNDS = 12;

// Get seed status
router.get('/status', async (req, res) => {
  try {
    const db = await connectToDatabase();
    const userCount = await db.collection(COLLECTIONS.USERS).countDocuments();
    const classCount = await db.collection(COLLECTIONS.CLASSES).countDocuments();
    const subjectCount = await db.collection(COLLECTIONS.SUBJECTS).countDocuments();

    res.json({
      seeded: userCount > 0,
      users: userCount,
      classes: classCount,
      subjects: subjectCount,
    });
  } catch (error) {
    console.error('Seed status error:', error);
    res.status(500).json({ error: 'Failed to get seed status' });
  }
});

// Force reseed - clears existing data and reseeds
router.post('/reseed', async (req, res) => {
  try {
    const { secret } = req.body;
    if (secret !== 'gyandeep-seed-2024') {
      return res.status(401).json({ error: 'Invalid secret' });
    }

    console.log('🔄 Starting force reseed...');
    const db = await connectToDatabase();

    // Clear existing data
    console.log('🗑️  Clearing existing data...');
    await db.collection(COLLECTIONS.USERS).deleteMany({});
    await db.collection(COLLECTIONS.CLASSES).deleteMany({});
    await db.collection(COLLECTIONS.SUBJECTS).deleteMany({});
    await db.collection(COLLECTIONS.ANNOUNCEMENTS).deleteMany({});
    await db.collection(COLLECTIONS.ATTENDANCE).deleteMany({});
    await db.collection(COLLECTIONS.GRADES).deleteMany({});
    console.log('✅ Existing data cleared');

    // Create Users
    console.log('👥 Creating users...');
    const adminPassword = await bcrypt.hash('Admin@123', SALT_ROUNDS);
    const teacherPassword = await bcrypt.hash('Teacher@123', SALT_ROUNDS);
    const studentPassword = await bcrypt.hash('Student@123', SALT_ROUNDS);

    const users = [
      {
        name: 'Admin',
        email: 'admin@gyandeep.edu',
        password: adminPassword,
        role: 'admin',
        active: true,
        emailVerified: true,
        preferences: {},
        history: [],
        assignedSubjects: [],
        performance: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Mr. Sharma',
        email: 'teacher@gyandeep.edu',
        password: teacherPassword,
        role: 'teacher',
        active: true,
        emailVerified: true,
        assignedSubjects: ['Mathematics', 'Physics'],
        preferences: { notifications: true },
        history: [],
        performance: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Rahul Kumar',
        email: 'student@gyandeep.edu',
        password: studentPassword,
        role: 'student',
        active: true,
        emailVerified: true,
        classId: null,
        subjects: [],
        xp: 0,
        level: 1,
        badges: [],
        coins: 0,
        streak: 0,
        preferences: {},
        history: [],
        performance: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    await db.collection(COLLECTIONS.USERS).insertMany(users);
    console.log('✅ Users created');

    // Create Classes
    console.log('🏫 Creating classes...');
    const classes = [
      { name: 'Class 10-A', section: 'A', grade: 10, subject: 'Science', active: true, createdAt: new Date(), updatedAt: new Date() },
      { name: 'Class 10-B', section: 'B', grade: 10, subject: 'Science', active: true, createdAt: new Date(), updatedAt: new Date() },
      { name: 'Class 9-A', section: 'A', grade: 9, subject: 'General', active: true, createdAt: new Date(), updatedAt: new Date() },
    ];
    await db.collection(COLLECTIONS.CLASSES).insertMany(classes);
    console.log('✅ Classes created');

    // Create Subjects
    console.log('📚 Creating subjects...');
    const subjects = [
      { name: 'Mathematics', code: 'MATH', teacherId: null, chapters: [], createdAt: new Date(), updatedAt: new Date() },
      { name: 'Physics', code: 'PHY', teacherId: null, chapters: [], createdAt: new Date(), updatedAt: new Date() },
      { name: 'Chemistry', code: 'CHEM', teacherId: null, chapters: [], createdAt: new Date(), updatedAt: new Date() },
      { name: 'Biology', code: 'BIO', teacherId: null, chapters: [], createdAt: new Date(), updatedAt: new Date() },
    ];
    await db.collection(COLLECTIONS.SUBJECTS).insertMany(subjects);
    console.log('✅ Subjects created');

    // Create Announcements
    console.log('📢 Creating announcements...');
    const announcements = [
      {
        title: 'Welcome to GyanDeep!',
        content: 'Welcome to your AI-powered smart classroom system. Get started by exploring the features!',
        priority: 'high',
        targetAudience: 'all',
        createdBy: 'system',
        createdAt: new Date(),
        expiresAt: null,
      },
    ];
    await db.collection(COLLECTIONS.ANNOUNCEMENTS).insertMany(announcements);
    console.log('✅ Announcements created');

    console.log('🎉 Database seeded successfully!');
    res.json({ 
      success: true, 
      message: 'Database seeded successfully',
      credentials: {
        admin: 'admin@gyandeep.edu / Admin@123',
        teacher: 'teacher@gyandeep.edu / Teacher@123',
        student: 'student@gyandeep.edu / Student@123',
      }
    });

  } catch (error) {
    console.error('Seed error:', error);
    res.status(500).json({ error: 'Failed to seed database' });
  }
});

export default router;
