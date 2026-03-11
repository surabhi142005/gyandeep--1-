/**
 * api/sessions/[id]/index.ts
 * GET /api/sessions/:id - Get session details
 */

import { NextRequest } from 'next/server';
import { prisma } from '../../lib/db';
import { requireAuth, requireTeacher, json, notFound, unauthorized } from '../../lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = requireAuth(request);
  if (!user) return unauthorized();

  try {
    const session = await prisma.classSession.findUnique({
      where: { id: params.id },
    });

    if (!session) {
      return notFound('Session not found');
    }

    // Get related data
    const [subject, classData, sessionNotes, quiz] = await Promise.all([
      session.subjectId ? prisma.subject.findMany({ where: { id: session.subjectId } }).then(r => r[0] || null) : null,
      session.classId ? prisma.class.findMany({ where: { id: session.classId } }).then(r => r[0] || null) : null,
      prisma.sessionNote.findMany({ where: { sessionId: params.id } }),
      prisma.quiz.findMany({ where: { sessionId: params.id }, orderBy: { createdAt: 'desc' } }).then(r => r[0] || null),
    ]);

    // Check expiry
    if (new Date() > session.expiry) {
      return json({ error: 'Session has expired' }, 410);
    }

    // For students - only return published quiz
    if (user.role === 'student') {
      if (!session.quizPublished) {
        return json({ error: 'Quiz not yet published' }, 403);
      }

      const questions = quiz ? await prisma.quizQuestion.findMany({ where: { quizId: quiz.id }, orderBy: { orderIndex: 'asc' } }) : [];

      return json({
        id: session.id,
        code: session.code,
        classId: session.classId,
        subjectId: session.subjectId,
        quizPublished: session.quizPublished,
        quizQuestions: questions,
      });
    }

    // For teachers - return full info
    const activeNote = sessionNotes.find(n => !n.deletedAt);

    return json({
      id: session.id,
      code: session.code,
      classId: session.classId,
      subjectId: session.subjectId,
      subject,
      class: classData,
      expiry: session.expiry instanceof Date ? session.expiry.getTime() : new Date(session.expiry).getTime(),
      quizPublished: session.quizPublished,
      hasNotes: !!activeNote,
      notesPreview: activeNote?.extractedText?.slice(0, 500) || null,
      quizQuestions: quiz?.questionsJson ? JSON.parse(quiz.questionsJson) : null,
      quizId: quiz?.id || null,
      endedAt: (session as any).endedAt || null,
      timetableEntryId: (session as any).timetableEntryId || null,
    });
  } catch (error) {
    console.error('Get session error:', error);
    return json({ error: 'Failed to get session' }, 500);
  }
}
