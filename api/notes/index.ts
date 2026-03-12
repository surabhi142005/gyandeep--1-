import { NextRequest } from 'next/server';
import { prisma } from '../../lib/db';
import { json, auth } from '../../lib/auth';

/**
 * api/notes/index.ts
 * GET /api/notes - List notes (centralized or session)
 */

export async function GET(request: NextRequest) {
  try {
    const user = await auth();
    if (!user) return json({ error: 'Unauthorized' }, 401);

    const { searchParams } = new URL(request.url);
    const classId = searchParams.get('classId');
    const subjectId = searchParams.get('subjectId');
    const type = searchParams.get('type') || 'centralized';

    const where: any = {};
    if (classId) where.classId = classId;
    if (subjectId) where.subjectId = subjectId;

    if (type === 'centralized') {
      const notes = await prisma.centralizedNote.findMany({
        where,
        orderBy: [{ unitNumber: 'asc' }, { createdAt: 'desc' }],
        include: {
          subject: { select: { name: true } },
          teacher: { select: { name: true } },
        },
      });
      return json(notes);
    } else {
      const sessionId = searchParams.get('sessionId');
      if (sessionId) where.sessionId = sessionId;
      
      const notes = await prisma.sessionNote.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          author: { select: { name: true } },
        },
      });
      return json(notes);
    }
  } catch (error) {
    console.error('Fetch notes error:', error);
    return json({ error: 'Internal server error' }, 500);
  }
}
