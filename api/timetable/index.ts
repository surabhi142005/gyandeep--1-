/**
 * api/timetable/index.ts
 * GET/POST /api/timetable - Class & Teacher Timetable
 */

import { NextRequest } from 'next/server';
import { prisma } from '../../lib/db';
import { requireAuth, json, forbidden, badRequest } from '../../lib/auth';

// GET - Get timetable for a class, teacher, or student
export async function GET(request: NextRequest) {
  const user = requireAuth(request);
  if (!user) return forbidden();

  try {
    const { classId, teacherId, day } = Object.fromEntries(new URL(request.url).searchParams);

    const where: any = {};

    if (classId) {
      where.classId = classId;
    } else if (teacherId) {
      where.teacherId = teacherId;
    } else if (user.role === 'student' && user.classId) {
      where.classId = user.classId;
    } else if (user.role === 'teacher') {
      where.teacherId = user.id;
    } else {
        // If admin and no params, maybe just list all? 
        // Or return bad request if it's too much data
        if (user.role !== 'admin') return badRequest('Missing filter parameters');
    }

    if (day) {
      where.day = day;
    }

    const timetable = await prisma.timetableEntry.findMany({
      where,
      orderBy: [
        { day: 'asc' },
        { startTime: 'asc' }
      ],
      include: {
        subject: { select: { id: true, name: true } },
        teacher: { select: { id: true, name: true } },
        class: { select: { id: true, name: true } }
      }
    });

    return json(timetable);
  } catch (error) {
    console.error('List timetable error:', error);
    return json({ error: 'Failed to list timetable' }, 500);
  }
}

// POST - Create/Update timetable entry (Admin only)
export async function POST(request: NextRequest) {
  const user = requireAuth(request);
  if (!user || user.role !== 'admin') return forbidden();

  try {
    const body = await request.json();
    const { id, day, startTime, endTime, subjectId, teacherId, classId, room, semester } = body;

    if (!day || !startTime || !endTime || !subjectId) {
      return badRequest('day, startTime, endTime, and subjectId are required');
    }

    if (id) {
        // Update existing
        const updated = await prisma.timetableEntry.update({
            where: { id },
            data: {
                day,
                startTime,
                endTime,
                subjectId,
                teacherId: teacherId || null,
                classId: classId || null,
                room,
                semester,
            }
        });
        return json(updated);
    } else {
        // Create new
        const created = await prisma.timetableEntry.create({
            data: {
                day,
                startTime,
                endTime,
                subjectId,
                teacherId: teacherId || null,
                classId: classId || null,
                room,
                semester,
                odId: `TIME-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            }
        });
        return json(created, 201);
    }
  } catch (error) {
    console.error('Save timetable error:', error);
    return json({ error: 'Failed to save timetable' }, 500);
  }
}

// DELETE - Remove timetable entry (Admin only)
export async function DELETE(request: NextRequest) {
    const user = requireAuth(request);
    if (!user || user.role !== 'admin') return forbidden();

    const { id } = Object.fromEntries(new URL(request.url).searchParams);
    if (!id) return badRequest('ID is required');

    try {
        await prisma.timetableEntry.delete({ where: { id } });
        return json({ ok: true });
    } catch (error) {
        console.error('Delete timetable error:', error);
        return json({ error: 'Failed to delete timetable' }, 500);
    }
}
