/**
 * server/routes/webhooks.js
 * Webhook management routes
 */

import express from 'express';
const router = express.Router();
import { ObjectId } from 'mongodb';
import { connectToDatabase, COLLECTIONS } from '../db/mongoAtlas.js';

router.get('/', async (req, res) => {
  try {
    const db = await connectToDatabase();
    const webhooks = await db.collection(COLLECTIONS.WEBHOOKS)
      .find({})
      .sort({ createdAt: -1 })
      .toArray();
    res.json(webhooks.map(w => ({ ...w, id: w._id?.toString() || w.id })));
  } catch (error) {
    console.error('Get webhooks error:', error);
    res.status(500).json({ error: 'Failed to fetch webhooks' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, url, events, secret, active } = req.body;
    if (!name || !url || !events) {
      return res.status(400).json({ error: 'Name, URL, and events are required' });
    }

    const db = await connectToDatabase();
    const result = await db.collection(COLLECTIONS.WEBHOOKS).insertOne({
      name,
      url,
      events: Array.isArray(events) ? events : [events],
      secret: secret || null,
      active: active ?? true,
      _id: new ObjectId(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    res.status(201).json({ ok: true, webhook: { id: result.insertedId.toString(), name, url, events } });
  } catch (error) {
    console.error('Create webhook error:', error);
    res.status(500).json({ error: 'Failed to create webhook' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const db = await connectToDatabase();
    const webhook = await db.collection(COLLECTIONS.WEBHOOKS).findOne(
      { _id: new ObjectId(req.params.id) }
    );
    if (!webhook) {
      return res.status(404).json({ error: 'Webhook not found' });
    }
    res.json({ ...webhook, id: webhook._id.toString() });
  } catch (error) {
    console.error('Get webhook error:', error);
    res.status(500).json({ error: 'Failed to fetch webhook' });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const db = await connectToDatabase();
    const updates = { ...req.body, updatedAt: new Date() };
    delete updates.id;

    await db.collection(COLLECTIONS.WEBHOOKS).updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: updates }
    );
    res.json({ ok: true });
  } catch (error) {
    console.error('Update webhook error:', error);
    res.status(500).json({ error: 'Failed to update webhook' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const db = await connectToDatabase();
    const result = await db.collection(COLLECTIONS.WEBHOOKS).deleteOne(
      { _id: new ObjectId(req.params.id) }
    );
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Webhook not found' });
    }
    res.json({ ok: true });
  } catch (error) {
    console.error('Delete webhook error:', error);
    res.status(500).json({ error: 'Failed to delete webhook' });
  }
});

router.post('/:id/test', async (req, res) => {
  try {
    const db = await connectToDatabase();
    const webhook = await db.collection(COLLECTIONS.WEBHOOKS).findOne(
      { _id: new ObjectId(req.params.id) }
    );
    if (!webhook) {
      return res.status(404).json({ error: 'Webhook not found' });
    }

    const testPayload = {
      event: 'test',
      timestamp: new Date().toISOString(),
      data: { message: 'This is a test webhook delivery' },
    };

    res.json({ ok: true, message: 'Webhook test queued', payload: testPayload });
  } catch (error) {
    console.error('Test webhook error:', error);
    res.status(500).json({ error: 'Failed to test webhook' });
  }
});

export default router;
