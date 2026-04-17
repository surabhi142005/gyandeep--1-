/**
 * api/sessions/[id]/publish.ts
 * POST /api/sessions/:id/publish - Publish quiz to students
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

    const session = await prisma.classSession.findFirst({
      where: { id: sessionId, teacherId: user.id },
      include: { quiz: true },
    });

    if (!session) {
      return notFound('Session not found');
    }

    if (!session.quiz || !session.quiz.questionsJson) {
      return badRequest('Generate quiz first');
    }

    // Publish quiz
    await prisma.quiz.update({
      where: { id: session.quiz.id },
      data: { published: true, publishedAt: new Date() },
    });

    await prisma.classSession.update({
      where: { id: sessionId },
      data: { quizPublished: true, quizPublishedAt: new Date() },
    });

    return json({
      ok: true,
      published: true,
      message: 'Quiz published. Students can now take the quiz.',
    });
  } catch (error) {
    console.error('Publish quiz error:', error);
    return json({ error: 'Failed to publish quiz' }, 500);
  }
}
