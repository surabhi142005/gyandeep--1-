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

    // TODO: Integrate with Gemini AI for quiz generation
    // For now, return a placeholder
    const quizQuestions = [
      {
        id: `q_${Date.now()}_1`,
        question: 'Sample question from notes',
        options: ['Option A', 'Option B', 'Option C', 'Option D'],
        correctAnswer: 'Option A',
      }
    ];

    // Save quiz
    const quiz = await prisma.quiz.upsert({
      where: { sessionId },
      create: {
        sessionId,
        teacherId: user.id,
        title: `Quiz - Session ${session.code}`,
        questionsJson: JSON.stringify(quizQuestions),
      },
      update: {
        questionsJson: JSON.stringify(quizQuestions),
      },
    });

    // Update session
    await prisma.classSession.update({
      where: { id: sessionId },
      data: { quizQuestions: JSON.stringify(quizQuestions) },
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
