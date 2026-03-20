/**
 * server/routes/tagPresets.js
 * Tag presets management routes
 */

import express from 'express';
const router = express.Router();
import { connectToDatabase, COLLECTIONS } from '../db/mongoAtlas.js';

router.get('/', async (req, res) => {
  try {
    const db = await connectToDatabase();
    const presets = await db.collection(COLLECTIONS.TAG_PRESETS).find({}).toArray();
    
    const result = {};
    for (const p of presets) {
      result[p.subject] = p.tags;
    }
    
    res.json(result);
  } catch (error) {
    console.error('Get tag presets error:', error);
    res.status(500).json({ error: 'Failed to fetch tag presets' });
  }
});

router.post('/update', async (req, res) => {
  try {
    const { subject, tags } = req.body;
    if (!subject || !Array.isArray(tags)) {
      return res.status(400).json({ error: 'Subject and tags array are required' });
    }

    const db = await connectToDatabase();
    await db.collection(COLLECTIONS.TAG_PRESETS).updateOne(
      { subject },
      { $set: { tags, updatedAt: new Date() } },
      { upsert: true }
    );

    res.json({ ok: true });
  } catch (error) {
    console.error('Update tag presets error:', error);
    res.status(500).json({ error: 'Failed to update tag presets' });
  }
});

export default router;
