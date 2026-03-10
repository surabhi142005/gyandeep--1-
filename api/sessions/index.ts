/**
 * api/sessions/index.ts
 * GET /api/sessions - List teacher's sessions
 * POST /api/sessions - Create new session
 */

import { NextRequest } from 'next/server';
import { prisma } from '../../lib/db';
import { requireTeacher, json, badRequest } from '../../lib/auth';

function generateSessionCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// GET - List sessions
export async function GET(request: NextRequest) {
  const user = requireTeacher(request);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const sessions = await prisma.classSession.findMany({
      where: { teacherId: user.id },
      orderBy: { createdAt: 'desc' },
    });

    const subjectIds = [...new Set(sessions.map(s => s.subjectId).filter(Boolean))];
    const classIds = [...new Set(sessions.map(s => s.classId).filter(Boolean))];

    const [subjects, classes, quizzes] = await Promise.all([
      prisma.subject.findMany({ where: { id: { $in: subjectIds } } }),
      prisma.class.findMany({ where: { id: { $in: classIds } } }),
      prisma.quiz.findMany({ where: { session_id: { $in: sessions.map(s => s.id) } } }),
    ]);

    const subjectMap = new Map(subjects.map(s => [s.id, s]));
    const classMap = new Map(classes.map(c => [c.id, c]));
    const quizMap = new Map(quizzes.map(q => [q.session_id, q]));

    return json(sessions.map(s => {
      const quiz = quizMap.get(s.id);
      return {
        id: s.id,
        code: s.code,
        classId: s.classId,
        class: classMap.get(s.classId) || null,
        subjectId: s.subjectId,
        subject: subjectMap.get(s.subjectId) || null,
        expiry: s.expiry instanceof Date ? s.expiry.getTime() : new Date(s.expiry).getTime(),
        quizPublished: s.quizPublished,
        hasNotes: !!quiz && quiz.questions_json,
        sessionStatus: s.sessionStatus,
        createdAt: s.createdAt instanceof Date ? s.createdAt.getTime() : new Date(s.createdAt).getTime(),
      };
    }));
  } catch (error) {
    console.error('List sessions error:', error);
    return json({ error: 'Failed to list sessions' }, 500);
  }
}

// POST - Create session
export async function POST(request: NextRequest) {
  const user = requireTeacher(request);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const { classId, subjectId, durationMinutes = 60 } = await request.json();

    if (!subjectId) {
      return badRequest('subjectId is required');
    }

    const id = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const code = generateSessionCode();
    const expiry = new Date(Date.now() + durationMinutes * 60 * 1000);

    const session = await prisma.classSession.create({
      data: {
        id,
        code,
        teacherId: user.id,
        classId: classId || null,
        subjectId,
        expiry,
      },
    });

    return json({
      ok: true,
      session: {
        id: session.id,
        code: session.code,
        classId: session.classId,
        subjectId: session.subjectId,
        expiry: session.expiry instanceof Date ? session.expiry.getTime() : new Date(session.expiry).getTime(),
        quizPublished: false,
        hasNotes: false,
      },
    });
  } catch (error) {
    console.error('Create session error:', error);
    return json({ error: 'Failed to create session' }, 500);
  }
}
