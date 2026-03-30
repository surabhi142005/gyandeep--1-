/**
 * api/tickets/index.ts
 * GET/POST /api/tickets - Support Ticket System
 */

import { NextRequest } from 'next/server';
import { prisma } from '../../lib/db';
import { requireAuth, json, badRequest, forbidden } from '../../lib/auth';

// GET - List tickets
export async function GET(request: NextRequest) {
  const user = requireAuth(request);
  if (!user) return forbidden();

  try {
    const { status, priority, category } = Object.fromEntries(new URL(request.url).searchParams);

    const where: any = {};

    // Students only see their own tickets
    if (user.role === 'student') {
      where.userId = user.id;
    } else if (user.role === 'teacher') {
      // Teachers might see tickets assigned to them or general tickets
      where.OR = [
        { assignedToId: user.id },
        { category: 'academic' }, // Example filter
      ];
    }
    // Admins see all by default

    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (category) where.category = category;

    const tickets = await prisma.ticket.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: {
        user: {
          select: { id: true, name: true, email: true }
        },
        assignedTo: {
          select: { id: true, name: true, email: true }
        },
        _count: {
          select: { replies: true }
        }
      }
    });

    return json(tickets);
  } catch (error) {
    console.error('List tickets error:', error);
    return json({ error: 'Failed to list tickets' }, 500);
  }
}

// POST - Create a new ticket
export async function POST(request: NextRequest) {
  const user = requireAuth(request);
  if (!user) return forbidden();

  try {
    const { subject, message, category = 'general', priority = 'medium', classId } = await request.json();

    if (!subject || !message) {
      return badRequest('Subject and message are required');
    }

    const ticket = await prisma.ticket.create({
      data: {
        userId: user.id,
        userName: user.name || 'Anonymous',
        subject,
        message,
        category,
        priority,
        classId: classId || null,
        status: 'open',
        odId: `TICK-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      }
    });

    return json(ticket, 201);
  } catch (error) {
    console.error('Create ticket error:', error);
    return json({ error: 'Failed to create ticket' }, 500);
  }
}
