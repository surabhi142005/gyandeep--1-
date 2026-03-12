import { NextRequest } from 'next/server';
import { prisma } from '../../lib/db';
import { json, badRequest, auth } from '../../lib/auth';
import { awardXP } from '../../lib/gamification';

/**
 * api/attendance/index.ts
 * GET /api/attendance - List attendance records
 * POST /api/attendance - Mark attendance
 */

export async function GET(request: NextRequest) {
  try {
    const user = await auth();
    if (!user) return json({ error: 'Unauthorized' }, 401);

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const studentId = searchParams.get('studentId');

    const where: any = {};
    if (sessionId) where.sessionId = sessionId;
    if (studentId) where.studentId = studentId;

    const attendance = await prisma.attendance.findMany({
      where,
      orderBy: { markedAt: 'desc' },
      include: {
        student: { select: { name: true, email: true } },
      },
    });

    return json(attendance);
  } catch (error) {
    console.error('Fetch attendance error:', error);
    return json({ error: 'Internal server error' }, 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await auth();
    if (!user) return json({ error: 'Unauthorized' }, 401);

    const { sessionId, studentId, status, location } = await request.json();

    if (!sessionId || !studentId) {
      return badRequest('sessionId and studentId are required');
    }

    // Verify session exists and is active
    const session = await prisma.classSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) return badRequest('Session not found');
    if (session.endedAt) return badRequest('Session has already ended');

    // UPSERT attendance
    const attendance = await prisma.attendance.upsert({
      where: {
        sessionId_studentId: { sessionId, studentId },
      },
      update: {
        status: status || 'present',
        markedAt: new Date(),
      },
      create: {
        sessionId,
        studentId,
        status: status || 'present',
      },
    });

    // Award XP for marking attendance
    if (status === 'present' || !status) {
      await awardXP(studentId, 'ATTENDANCE_MARKED', `Attended session: ${session.code}`);
    }

    return json({ ok: true, attendance });
  } catch (error) {
    console.error('Mark attendance error:', error);
    return json({ error: 'Internal server error' }, 500);
  }
}
