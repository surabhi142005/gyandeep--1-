/**
 * api/sessions/[id]/end.ts
 * POST /api/sessions/:id/end - End session and delete notes
 */

import { NextRequest } from 'next/server';
import { prisma } from '../../../lib/db';
import { requireTeacher, json, notFound } from '../../../lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = requireTeacher(request);
  if (!user) return requireTeacher(request) as any;

  try {
    const sessionId = params.id;

    const session = await prisma.classSession.findFirst({
      where: { id: sessionId, teacherId: user.id },
    });

    if (!session) {
      return notFound('Session not found');
    }

    // Delete session notes
    await prisma.sessionNote.update({
      where: { sessionId },
      data: {
        deletedAt: new Date(),
        content: null,
        extractedText: null,
      },
    });

    // End session
    await prisma.classSession.update({
      where: { id: sessionId },
      data: {
        expiry: new Date(),
        sessionStatus: 'ended',
      },
    });

    return json({
      ok: true,
      ended: true,
      message: 'Session ended. Session notes deleted.',
    });
  } catch (error) {
    console.error('End session error:', error);
    return json({ error: 'Failed to end session' }, 500);
  }
}
