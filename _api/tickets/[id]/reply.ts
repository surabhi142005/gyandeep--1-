/**
 * api/tickets/[id]/reply.ts
 * POST /api/tickets/[id]/reply
 */

import { NextRequest } from 'next/server';
import { prisma } from '../../../lib/db';
import { requireAuth, json, forbidden, notFound, badRequest } from '../../../lib/auth';

// Helper to get ID from URL (one level higher than index.ts)
function getTicketId(url: string) {
  const parts = url.split('/');
  // URL: .../api/tickets/[id]/reply
  return parts[parts.length - 2];
}

// POST - Add a reply to a ticket
export async function POST(request: NextRequest) {
  const user = requireAuth(request);
  if (!user) return forbidden();

  const id = getTicketId(request.url);

  try {
    const { message } = await request.json();

    if (!message) {
      return badRequest('Message is required');
    }

    const ticket = await prisma.ticket.findUnique({ where: { id } });
    if (!ticket) return notFound('Ticket not found');

    // Access control: only owner, assigned teacher, or admin
    if (user.role === 'student' && ticket.userId !== user.id) {
      return forbidden('Access denied');
    }

    const reply = await prisma.ticketReply.create({
      data: {
        ticketId: id,
        userId: user.id,
        userName: user.name || 'Anonymous',
        message,
        odId: `REPLY-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      }
    });

    // Update ticket's updatedAt timestamp and potentially status
    await prisma.ticket.update({
      where: { id },
      data: {
        updatedAt: new Date(),
        status: user.role !== 'student' ? 'answered' : 'open',
      }
    });

    return json(reply, 201);
  } catch (error) {
    console.error('Create ticket reply error:', error);
    return json({ error: 'Failed to create ticket reply' }, 500);
  }
}
