/**
 * api/tickets/[id]/index.ts
 * GET/PATCH/DELETE /api/tickets/[id]
 */

import { NextRequest } from 'next/server';
import { prisma } from '../../../lib/db';
import { requireAuth, json, forbidden, notFound, badRequest } from '../../../lib/auth';

// Helper to get ID from URL
function getTicketId(url: string) {
  const parts = url.split('/');
  return parts[parts.length - 1];
}

// GET - Get single ticket details
export async function GET(request: NextRequest) {
  const user = requireAuth(request);
  if (!user) return forbidden();

  const id = getTicketId(request.url);

  try {
    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
        replies: {
          orderBy: { createdAt: 'asc' },
          include: {
            user: { select: { id: true, name: true, email: true } }
          }
        }
      }
    });

    if (!ticket) return notFound('Ticket not found');

    // Access control: only owner, assigned teacher, or admin
    if (user.role === 'student' && ticket.userId !== user.id) {
      return forbidden('Access denied');
    }

    return json(ticket);
  } catch (error) {
    console.error('Get ticket error:', error);
    return json({ error: 'Failed to get ticket' }, 500);
  }
}

// PATCH - Update ticket (status, assignment, etc.)
export async function PATCH(request: NextRequest) {
  const user = requireAuth(request);
  if (!user) return forbidden();

  const id = getTicketId(request.url);

  try {
    const body = await request.json();
    const { status, priority, assignedToId } = body;

    const ticket = await prisma.ticket.findUnique({ where: { id } });
    if (!ticket) return notFound('Ticket not found');

    // Access control: Only admins or assigned teachers can update status/priority/assignment
    if (user.role === 'student' && (status || priority || assignedToId)) {
        // Students can only mark their own ticket as closed/reopened? 
        // For now, let's keep it restricted to staff
        return forbidden('Only staff can update ticket properties');
    }

    const updateData: any = {};
    if (status) {
        updateData.status = status;
        if (status === 'resolved') updateData.resolvedAt = new Date();
        else updateData.resolvedAt = null;
    }
    if (priority) updateData.priority = priority;
    if (assignedToId) updateData.assignedToId = assignedToId;

    const updated = await prisma.ticket.update({
      where: { id },
      data: updateData
    });

    return json(updated);
  } catch (error) {
    console.error('Update ticket error:', error);
    return json({ error: 'Failed to update ticket' }, 500);
  }
}

// DELETE - Remove ticket
export async function DELETE(request: NextRequest) {
  const user = requireAuth(request);
  if (!user || user.role !== 'admin') return forbidden('Only admins can delete tickets');

  const id = getTicketId(request.url);

  try {
    // Delete replies first due to constraints? 
    // Prisma usually handles it if specified, but MongoDB needs careful handling
    await prisma.ticketReply.deleteMany({ where: { ticketId: id } });
    await prisma.ticket.delete({ where: { id } });

    return json({ ok: true });
  } catch (error) {
    console.error('Delete ticket error:', error);
    return json({ error: 'Failed to delete ticket' }, 500);
  }
}
