/**
 * server/routes/seed.js
 * Database seeding endpoint
 */

import express from 'express';
const router = express.Router();
import { connectToDatabase, COLLECTIONS } from '../db/mongoAtlas.js';
import { reseedDemoDatabase } from '../db/demoSeed.js';

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

    const result = await reseedDemoDatabase({ clearExisting: true });

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('Seed error:', error);
    res.status(500).json({ error: 'Failed to seed database' });
  }
});

export default router;
