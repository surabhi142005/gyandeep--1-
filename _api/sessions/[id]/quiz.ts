/**
 * api/sessions/[id]/quiz.ts
 * POST /api/sessions/:id/quiz - Generate quiz from session notes
 */

import { NextRequest } from 'next/server';
import { prisma } from '../../../lib/db';
import { requireTeacher, json, notFound, badRequest } from '../../../lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = requireTeacher(request);
  if (!user) return requireTeacher(request) as any;

  try {
    const sessionId = params.id;

    // Get session with notes
    const session = await prisma.classSession.findFirst({
      where: { id: sessionId, teacherId: user.id },
    });

    if (!session) {
      return notFound('Session not found');
    }

    // Get session notes
    const sessionNote = await prisma.sessionNote.findUnique({
      where: { sessionId },
    });

    if (!sessionNote || !sessionNote.extractedText) {
      return badRequest('No session notes uploaded for this session');
    }

    const body = await request.json();
    const quizType = ['pre', 'post', 'main'].includes(body?.quizType) ? body.quizType : 'main';

    // Placeholder quiz generation; real path uses backend AI service
    const quizQuestions = [
      {
        id: `q_${Date.now()}_1`,
        question: 'Sample question from notes',
        options: ['Option A', 'Option B', 'Option C', 'Option D'],
        correctAnswer: 'Option A',
      }
    ];

    // Save quiz (allow 1:N quizzes per session)
    const quiz = await prisma.quiz.create({
      data: {
        sessionId,
        teacherId: user.id,
        title: `Quiz - Session ${session.code}`,
        questionsJson: JSON.stringify(quizQuestions),
        quizType,
        published: false,
      },
    });

    return json({
      quiz: quizQuestions,
      quizId: quiz.id,
      message: 'Quiz generated from SESSION NOTES. Publish to allow students to take.',
    });
  } catch (error) {
    console.error('Generate quiz error:', error);
    return json({ error: 'Failed to generate quiz' }, 500);
  }
}
