import { NextRequest } from 'next/server';
import { prisma } from '../../../lib/db';
import { json, requireAuth } from '../../../lib/auth';

/**
 * api/sessions/[id]/index.ts
 * GET /api/sessions/:id - Get session details
 */

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = requireAuth(request);
    if (!user) return json({ error: 'Unauthorized' }, 401);

    const sessionId = params.id;

    const session = await prisma.classSession.findUnique({
      where: { id: sessionId },
      include: {
        subject: { select: { name: true } },
        class: { select: { name: true } },
        teacher: { select: { name: true } },
        notes: { where: { deletedAt: null } },
        quizzes: true,
      },
    });

    if (!session) return json({ error: 'Session not found' }, 404);

    return json(session);
  } catch (error) {
    console.error('Fetch session error:', error);
    return json({ error: 'Internal server error' }, 500);
  }
}

/**
 * POST /api/sessions/:id/end
 */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = requireAuth(request);
    if (!user) return json({ error: 'Unauthorized' }, 401);
    if (!['teacher', 'admin'].includes(user.role)) return json({ error: 'Forbidden' }, 403);

    const sessionId = params.id;

    const session = await prisma.classSession.update({
      where: { id: sessionId },
      data: {
        endedAt: new Date(),
        expiry: new Date(), // Expire the code too
      },
    });

    // Delete session notes upon ending (as per architecture)
    await prisma.sessionNote.updateMany({
      where: { sessionId },
      data: {
        deletedAt: new Date(),
        content: "[DELETED]",
        status: "deleted"
      },
    });

    return json({ ok: true, session });
  } catch (error) {
    console.error('End session error:', error);
    return json({ error: 'Internal server error' }, 500);
  }
}
