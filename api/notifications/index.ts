/**
 * api/notifications/index.ts
 * GET/PATCH /api/notifications - User Notifications
 */

import { NextRequest } from 'next/server';
import { prisma } from '../../lib/db';
import { requireAuth, json, forbidden, badRequest } from '../../lib/auth';

// GET - List user notifications
export async function GET(request: NextRequest) {
  const user = requireAuth(request);
  if (!user) return forbidden();

  try {
    const { unreadOnly, limit = '50' } = Object.fromEntries(new URL(request.url).searchParams);

    const where: any = { userId: user.id };
    if (unreadOnly === 'true') {
      where.read = false;
    }

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit, 10),
    });

    return json(notifications);
  } catch (error) {
    console.error('List notifications error:', error);
    return json({ error: 'Failed to list notifications' }, 500);
  }
}

// PATCH - Mark notifications as read
export async function PATCH(request: NextRequest) {
  const user = requireAuth(request);
  if (!user) return forbidden();

  try {
    const { ids, all } = await request.json();

    if (all === true) {
      await prisma.notification.updateMany({
        where: { userId: user.id, read: false },
        data: { read: true, readAt: new Date() },
      });
    } else if (Array.isArray(ids)) {
      await prisma.notification.updateMany({
        where: { 
          id: { in: ids },
          userId: user.id 
        },
        data: { read: true, readAt: new Date() },
      });
    } else {
      return badRequest('Either "all" or "ids" array must be provided');
    }

    return json({ ok: true });
  } catch (error) {
    console.error('Update notifications error:', error);
    return json({ error: 'Failed to update notifications' }, 500);
  }
}

// POST - Internal helper to create notification (might be used by other API endpoints)
// In a real app, this might be a separate service call
export async function POST(request: NextRequest) {
    const user = requireAuth(request);
    // Only allow internal/admin to create notifications for others?
    if (!user || user.role !== 'admin') return forbidden();

    try {
        const { userId, type, title, message, relatedId, relatedType } = await request.json();

        if (!userId || !type || !title || !message) {
            return badRequest('userId, type, title, and message are required');
        }

        const notification = await prisma.notification.create({
            data: {
                userId,
                type,
                title,
                message,
                relatedId,
                relatedType,
                read: false,
                odId: `NOTIF-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            }
        });

        return json(notification, 201);
    } catch (error) {
        console.error('Create notification error:', error);
        return json({ error: 'Failed to create notification' }, 500);
    }
}
