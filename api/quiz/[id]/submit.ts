/**
 * api/quiz/[id]/submit.ts
 * POST /api/quiz/:id/submit - Student submits quiz
 */

import { NextRequest } from 'next/server';
import { prisma } from '../../../lib/db';
import { requireAuth, json, notFound, badRequest, forbidden } from '../../../lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = requireAuth(request);
  if (!user) return requireAuth(request) as any;

  if (user.role !== 'student') {
    return forbidden('Only students can submit quizzes');
  }

  try {
    const { answers } = await request.json();
    const sessionId = params.id;

    if (!answers || !Array.isArray(answers)) {
      return badRequest('answers array is required');
    }

    // Get session
    const session = await prisma.classSession.findUnique({
      where: { id: sessionId },
      include: { quiz: true },
    });

    if (!session) {
      return notFound('Session not found');
    }

    if (new Date() > session.expiry) {
      return json({ error: 'Session has expired' }, 410);
    }

    if (!session.quizPublished || !session.quiz?.questionsJson) {
      return forbidden('Quiz not yet published');
    }

    // Check if already submitted
    const existing = await prisma.quizSubmission.findUnique({
      where: {
        sessionId_studentId: {
          sessionId,
          studentId: user.id,
        },
      },
    });

    if (existing) {
      return forbidden('Quiz already submitted');
    }

    // Grade quiz
    const questions = JSON.parse(session.quiz.questionsJson);
    let correctCount = 0;
    const gradedAnswers = answers.map((ans: any, idx: number) => {
      const question = questions[idx];
      const isCorrect = question && ans.answer === question.correctAnswer;
      if (isCorrect) correctCount++;
      return {
        questionIndex: idx,
        selectedAnswer: ans.answer,
        isCorrect,
        correctAnswer: question?.correctAnswer,
      };
    });

    const totalQuestions = questions.length;
    const percentage = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

    // Create submission
    const submission = await prisma.quizSubmission.create({
      data: {
        sessionId,
        studentId: user.id,
        answersJson: JSON.stringify(gradedAnswers),
        correctCount,
        totalQuestions,
        percentage,
      },
    });

    return json({
      ok: true,
      submissionId: submission.id,
      correctCount,
      totalQuestions,
      percentage,
      answers: gradedAnswers,
    });
  } catch (error) {
    console.error('Submit quiz error:', error);
    return json({ error: 'Failed to submit quiz' }, 500);
  }
}
