import { NextRequest } from 'next/server';
import { prisma } from '../../lib/db';
import { json, badRequest, auth, ensureRole } from '../../lib/auth';

/**
 * api/announcements/index.ts
 * GET /api/announcements - List announcements
 * POST /api/announcements - Create announcement
 */

export async function GET(request: NextRequest) {
  try {
    const user = await auth();
    if (!user) return json({ error: 'Unauthorized' }, 401);

    const { searchParams } = new URL(request.url);
    const classId = searchParams.get('classId');

    const where: any = {};
    if (classId) {
      where.classId = classId;
    } else if (user.role === 'student' && user.classId) {
      where.classId = user.classId;
    }

    const announcements = await prisma.announcement.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        author: { select: { name: true, role: true } },
      },
    });

    return json(announcements);
  } catch (error) {
    console.error('Fetch announcements error:', error);
    return json({ error: 'Internal server error' }, 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await auth();
    if (!user) return json({ error: 'Unauthorized' }, 401);
    if (!['teacher', 'admin'].includes(user.role)) return json({ error: 'Forbidden' }, 403);

    const { title, message, classId, priority } = await request.json();

    if (!title || !message) {
      return badRequest('Title and message are required');
    }

    const announcement = await prisma.announcement.create({
      data: {
        title,
        message,
        classId: classId || null,
        authorId: user.id,
        priority: priority || 'normal',
      },
    });

    return json({ ok: true, announcement });
  } catch (error) {
    console.error('Create announcement error:', error);
    return json({ error: 'Internal server error' }, 500);
  }
}
