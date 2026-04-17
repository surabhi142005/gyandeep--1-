import { NextRequest } from 'next/server';
import { prisma } from '../../lib/db';
import { json, badRequest, requireAuth } from '../../lib/auth';
import { awardXP } from '../../lib/gamification';

/**
 * api/grades/index.ts
 * GET /api/grades - List student grades
 * POST /api/grades - Create or update grade
 */

export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request);
    if (!user) return json({ error: 'Unauthorized' }, 401);

    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');
    const subjectId = searchParams.get('subjectId');

    const where: any = {};
    if (studentId) {
      // Students can only see their own grades unless teacher/admin
      if (user.role === 'student' && user.id !== studentId) {
        return json({ error: 'Forbidden' }, 403);
      }
      where.studentId = studentId;
    } else if (user.role === 'student') {
      where.studentId = user.id;
    }

    if (subjectId) where.subjectId = subjectId;

    const grades = await prisma.grade.findMany({
      where,
      orderBy: { gradedAt: 'desc' },
      include: {
        subject: { select: { name: true } },
        teacher: { select: { name: true } },
      },
    });

    return json(grades);
  } catch (error) {
    console.error('Fetch grades error:', error);
    return json({ error: 'Internal server error' }, 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = requireAuth(request);
    if (!user) return json({ error: 'Unauthorized' }, 401);
    if (!['teacher', 'admin'].includes(user.role)) return json({ error: 'Forbidden' }, 403);

    const { studentId, subjectId, score, maxScore, title, category, quizAttemptId } = await request.json();

    if (!studentId || !subjectId || score === undefined || !maxScore) {
      return badRequest('Missing required fields');
    }

    const grade = await prisma.grade.create({
      data: {
        studentId,
        subjectId,
        score: Number(score),
        maxScore: Number(maxScore),
        title,
        category: category || 'General',
        teacherId: user.id,
        quizAttemptId,
        date: new Date().toISOString(),
      },
    });

    // Award XP for high scores (Perfect score bonus)
    if (score === maxScore) {
      await awardXP(studentId, 'PERFECT_SCORE_BONUS', `Scored 100% in ${title}`);
    }

    return json({ ok: true, grade });
  } catch (error) {
    console.error('Create grade error:', error);
    return json({ error: 'Internal server error' }, 500);
  }
}
