/**
 * server/routes/tickets.js
 * Support ticket system routes
 */

import express from 'express';
const router = express.Router();
import { ObjectId } from 'mongodb';
import { connectToDatabase, COLLECTIONS } from '../db/mongoAtlas.js';
import { broadcastTicketUpdate } from '../services/broadcast.js';
import { broadcastToUser, broadcastToAll } from './events.js';
import { authMiddleware } from '../middleware/auth.js';

router.get('/', authMiddleware, async (req, res) => {
  try {
    const db = await connectToDatabase();
    const { status, priority, assignedTo } = req.query;
    
    const filter = {};
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (assignedTo) filter.assignedToId = assignedTo;

    const tickets = await db.collection(COLLECTIONS.TICKETS)
      .find(filter)
      .sort({ createdAt: -1 })
      .toArray();
    
    res.json(tickets.map(t => ({ ...t, id: t._id?.toString() || t.id })));
  } catch (error) {
    console.error('Get tickets error:', error);
    res.status(500).json({ error: 'Failed to fetch tickets' });
  }
});

router.get('/unassigned', authMiddleware, async (req, res) => {
  try {
    const db = await connectToDatabase();
    const tickets = await db.collection(COLLECTIONS.TICKETS)
      .find({ assignedToId: { $exists: false } })
      .sort({ priority: -1, createdAt: -1 })
      .toArray();
    res.json(tickets.map(t => ({ ...t, id: t._id?.toString() || t.id })));
  } catch (error) {
    console.error('Get unassigned tickets error:', error);
    res.status(500).json({ error: 'Failed to fetch tickets' });
  }
});

router.post('/', authMiddleware, async (req, res) => {
  try {
    const db = await connectToDatabase();
    const now = new Date();

    const ticket = {
      ...req.body,
      status: 'open',
      priority: req.body.priority || 'medium',
      version: 1,
      _id: new ObjectId(),
      createdAt: now,
      updatedAt: now,
    };

    const result = await db.collection(COLLECTIONS.TICKETS).insertOne(ticket);
    
    if (req.body.message) {
      await db.collection(COLLECTIONS.TICKET_REPLIES).insertOne({
        ticketId: result.insertedId,
        message: req.body.message,
        authorId: req.body.authorId,
        authorName: req.body.authorName || 'User',
        isStaff: false,
        _id: new ObjectId(),
        createdAt: now,
      });
    }

    const ticketId = result.insertedId.toString();
    broadcastToAll('ticket-created', { id: ticketId, ...ticket });
    
    if (ticket.userId) {
      broadcastToUser(ticket.userId, 'ticket-update', { id: ticketId, status: 'open', type: 'created' });
    }

    res.status(201).json({ ok: true, ticket: { ...ticket, id: ticketId } });
  } catch (error) {
    console.error('Create ticket error:', error);
    res.status(500).json({ error: 'Failed to create ticket' });
  }
});

router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const db = await connectToDatabase();
    const ticket = await db.collection(COLLECTIONS.TICKETS).findOne(
      { _id: new ObjectId(req.params.id) }
    );
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const replies = await db.collection(COLLECTIONS.TICKET_REPLIES)
      .find({ ticketId: ticket._id })
      .sort({ createdAt: 1 })
      .toArray();

    res.json({
      ...ticket,
      id: ticket._id.toString(),
      replies: replies.map(r => ({ ...r, id: r._id.toString() })),
    });
  } catch (error) {
    console.error('Get ticket error:', error);
    res.status(500).json({ error: 'Failed to fetch ticket' });
  }
});

router.post('/:id/reply', authMiddleware, async (req, res) => {
  try {
    const { message, expectedVersion, authorId, authorName, isStaff } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const db = await connectToDatabase();
    const now = new Date();

    if (expectedVersion) {
      const ticket = await db.collection(COLLECTIONS.TICKETS).findOne(
        { _id: new ObjectId(req.params.id) }
      );
      if (ticket.version !== expectedVersion) {
        return res.status(409).json({ error: 'Ticket was modified by another user' });
      }
    }

    const reply = await db.collection(COLLECTIONS.TICKET_REPLIES).insertOne({
      ticketId: new ObjectId(req.params.id),
      message,
      authorId: authorId || 'system',
      authorName: authorName || 'System',
      isStaff: isStaff || false,
      _id: new ObjectId(),
      createdAt: now,
    });

    await db.collection(COLLECTIONS.TICKETS).updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { updatedAt: now }, $inc: { version: 1 } }
    );

    broadcastToAll('ticket-replied', { id: req.params.id, replyId: reply.insertedId.toString() });

    res.json({ ok: true, reply: { ...reply, id: reply.insertedId.toString() } });
  } catch (error) {
    console.error('Reply to ticket error:', error);
    res.status(500).json({ error: 'Failed to reply to ticket' });
  }
});

router.post('/:id/close', authMiddleware, async (req, res) => {
  try {
    const { expectedVersion, resolvedById } = req.body;

    const db = await connectToDatabase();

    if (expectedVersion) {
      const ticket = await db.collection(COLLECTIONS.TICKETS).findOne(
        { _id: new ObjectId(req.params.id) }
      );
      if (ticket.version !== expectedVersion) {
        return res.status(409).json({ error: 'Ticket was modified by another user' });
      }
    }

    await db.collection(COLLECTIONS.TICKETS).updateOne(
      { _id: new ObjectId(req.params.id) },
      {
        $set: {
          status: 'resolved',
          resolvedAt: new Date(),
          resolvedById: resolvedById || 'system',
          updatedAt: new Date(),
        },
        $inc: { version: 1 },
      }
    );

    broadcastToAll('ticket-update', { id: req.params.id, status: 'resolved', type: 'closed' });

    res.json({ ok: true });
  } catch (error) {
    console.error('Close ticket error:', error);
    res.status(500).json({ error: 'Failed to close ticket' });
  }
});

router.patch('/:id/assign', authMiddleware, async (req, res) => {
  try {
    const { adminId } = req.body;
    const db = await connectToDatabase();

    await db.collection(COLLECTIONS.TICKETS).updateOne(
      { _id: new ObjectId(req.params.id) },
      {
        $set: {
          assignedToId: adminId,
          assignedAt: new Date(),
          updatedAt: new Date(),
        },
        $inc: { version: 1 },
      }
    );

    broadcastToUser(adminId, 'ticket-update', { id: req.params.id, assignedToId: adminId, type: 'assigned' });

    res.json({ ok: true, assignedToId: adminId });
  } catch (error) {
    console.error('Assign ticket error:', error);
    res.status(500).json({ error: 'Failed to assign ticket' });
  }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const db = await connectToDatabase();
    
    await db.collection(COLLECTIONS.TICKET_REPLIES).deleteMany(
      { ticketId: new ObjectId(req.params.id) }
    );
    
    const result = await db.collection(COLLECTIONS.TICKETS).deleteOne(
      { _id: new ObjectId(req.params.id) }
    );
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    
    res.json({ ok: true });
  } catch (error) {
    console.error('Delete ticket error:', error);
    res.status(500).json({ error: 'Failed to delete ticket' });
  }
});

export default router;
