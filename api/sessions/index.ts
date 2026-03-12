import { NextRequest } from 'next/server';
import { prisma } from '../../lib/db';
import { json, badRequest, auth, ensureRole } from '../../lib/auth';

/**
 * api/sessions/index.ts
 * GET /api/sessions - List teacher's sessions
 * POST /api/sessions - Create new session
 */

export async function GET(request: NextRequest) {
  try {
    const user = await auth();
    if (!user) return json({ error: 'Unauthorized' }, 401);
    if (!['teacher', 'admin'].includes(user.role)) return json({ error: 'Forbidden' }, 403);

    const sessions = await prisma.classSession.findMany({
      where: {
        teacherId: user.id,
        expiry: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    return json(sessions);
  } catch (error) {
    console.error('Fetch sessions error:', error);
    return json({ error: 'Internal server error' }, 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await auth();
    if (!user) return json({ error: 'Unauthorized' }, 401);
    if (!['teacher', 'admin'].includes(user.role)) return json({ error: 'Forbidden' }, 403);

    const { classId, subjectId, durationMinutes = 60, timetableEntryId } = await request.json();

    if (!subjectId) return badRequest('subjectId is required');

    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const expiry = new Date(Date.now() + durationMinutes * 60 * 1000);

    const session = await prisma.classSession.create({
      data: {
        code,
        teacherId: user.id,
        classId: classId || null,
        subjectId,
        expiry,
        timetableEntryId: timetableEntryId || null,
        odId: `sess_${Date.now()}`,
      },
    });

    return json({ ok: true, session });
  } catch (error) {
    console.error('Create session error:', error);
    return json({ error: 'Internal server error' }, 500);
  }
}
