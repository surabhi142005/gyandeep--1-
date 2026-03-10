/**
 * api/sessions/[id]/grade.ts
 * POST /api/sessions/:id/grade - Grade student and DELETE session notes when all graded
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
    const { studentId, score, maxScore } = await request.json();

    if (!studentId || score == null || maxScore == null) {
      return badRequest('studentId, score, and maxScore are required');
    }

    const session = await prisma.classSession.findFirst({
      where: { id: sessionId, teacherId: user.id },
    });

    if (!session) {
      return notFound('Session not found');
    }

    // Create grade
    const grade = await prisma.grade.create({
      data: {
        studentId,
        subject: session.subjectId,
        category: 'quiz',
        title: `Quiz - Session ${session.code}`,
        score,
        maxScore,
        weight: 1,
        date: new Date().toISOString().split('T')[0],
        teacherId: user.id,
        sessionId,
      },
    });

    // Check if all students in class are graded
    let notesDeleted = false;
    let allGraded = false;

    if (session.classId) {
      const classStudents = await prisma.user.findMany({
        where: { classId: session.classId, role: 'student', active: true },
      });

      const gradedCount = await prisma.grade.count({
        where: { sessionId },
      });

      allGraded = classStudents.length > 0 && gradedCount >= classStudents.length;

      if (allGraded) {
        // DELETE SESSION NOTES
        await prisma.sessionNote.update({
          where: { sessionId },
          data: {
            deletedAt: new Date(),
            content: null,
            extractedText: null,
          },
        });

        // Update session status
        await prisma.classSession.update({
          where: { id: sessionId },
          data: { sessionStatus: 'completed' },
        });

        notesDeleted = true;
      }
    }

    return json({
      ok: true,
      gradeId: grade.id,
      notesDeleted,
      allGraded,
      message: allGraded
        ? 'Grade saved. ALL SESSION NOTES DELETED as all students are graded.'
        : 'Grade saved. Session notes will be deleted when all students are graded.',
    });
  } catch (error) {
    console.error('Grade error:', error);
    return json({ error: 'Failed to save grade' }, 500);
  }
}
