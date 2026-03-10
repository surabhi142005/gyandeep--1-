/**
 * api/sessions/[id]/notes.ts
 * POST /api/sessions/:id/notes - Upload session notes (temporary)
 * GET /api/sessions/:id/notes - Get session notes
 */

import { NextRequest } from 'next/server';
import { prisma } from '../../../lib/db';
import { requireTeacher, requireAuth, json, notFound, badRequest } from '../../../lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = requireTeacher(request);
  if (!user) return requireTeacher(request) as any;

  try {
    const { content } = await request.json();
    const sessionId = params.id;

    // Verify session exists and belongs to teacher
    const session = await prisma.classSession.findFirst({
      where: { id: sessionId, teacherId: user.id },
    });

    if (!session) {
      return notFound('Session not found');
    }

    // Check if notes already exist
    const existingNote = await prisma.sessionNote.findUnique({
      where: { sessionId },
    });

    if (existingNote && !existingNote.deletedAt) {
      return badRequest('Session already has notes. Delete existing notes first.');
    }

    // Create session note
    const note = await prisma.sessionNote.upsert({
      where: { sessionId },
      create: {
        sessionId,
        content: content || '',
        extractedText: content || '',
      },
      update: {
        content: content || '',
        extractedText: content || '',
        deletedAt: null,
      },
    });

    return json({
      ok: true,
      noteId: note.id,
      message: 'Session notes saved. These will be DELETED after all students are graded.',
    });
  } catch (error) {
    console.error('Upload notes error:', error);
    return json({ error: 'Failed to upload notes' }, 500);
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = requireAuth(request);
  if (!user) return requireAuth(request) as any;

  try {
    const note = await prisma.sessionNote.findUnique({
      where: { sessionId: params.id },
    });

    if (!note || note.deletedAt) {
      return json({ hasNotes: false, notes: null });
    }

    return json({
      hasNotes: true,
      noteId: note.id,
      notes: note.extractedText || note.content,
      createdAt: note.createdAt.getTime(),
    });
  } catch (error) {
    console.error('Get notes error:', error);
    return json({ error: 'Failed to get notes' }, 500);
  }
}
