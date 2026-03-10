/**
 * api/notes/centralized/index.ts
 * GET /api/notes/centralized - List centralized notes
 * POST /api/notes/centralized - Create centralized note (persistent)
 */

import { NextRequest } from 'next/server';
import { prisma } from '../../../lib/db';
import { requireTeacher, requireAuth, json, badRequest } from '../../../lib/auth';

// GET - List centralized notes
export async function GET(request: NextRequest) {
  const user = requireAuth(request);
  if (!user) return requireAuth(request) as any;

  try {
    const { subjectId, unitNumber, classId } = Object.fromEntries(new URL(request.url).searchParams);

    if (!subjectId) {
      return badRequest('subjectId is required');
    }

    let query: any = { subjectId };

    if (unitNumber) {
      query.unitNumber = parseInt(unitNumber);
    }

    if (classId) {
      query.OR = [{ classId }, { classId: null }];
    }

    const notes = await prisma.centralizedNote.findMany({
      where: query,
      orderBy: [{ unitNumber: 'asc' }, { createdAt: 'desc' }],
    });

    return json(notes);
  } catch (error) {
    console.error('List centralized notes error:', error);
    return json({ error: 'Failed to list notes' }, 500);
  }
}

// POST - Create centralized note
export async function POST(request: NextRequest) {
  const user = requireTeacher(request);
  if (!user) return requireTeacher(request) as any;

  try {
    const { classId, subjectId, unitNumber, unitName, title, content, noteType } = await request.json();

    if (!subjectId || !unitNumber || !unitName || !title) {
      return badRequest('subjectId, unitNumber, unitName, and title are required');
    }

    if (!content) {
      return badRequest('content is required');
    }

    const note = await prisma.centralizedNote.create({
      data: {
        classId: classId || null,
        subjectId,
        unitNumber: parseInt(unitNumber),
        unitName,
        title,
        content,
        noteType: ['class_notes', 'quiz_notes'].includes(noteType) ? noteType : 'class_notes',
        teacherId: user.id,
      },
    });

    return json({
      ok: true,
      id: note.id,
      message: 'Centralized note saved. Available to students indefinitely.',
    });
  } catch (error) {
    console.error('Create centralized note error:', error);
    return json({ error: 'Failed to create note' }, 500);
  }
}
