/**
 * api/admin/classes.ts
 * GET/POST /api/admin/classes - Manage classes
 */

import { NextRequest } from 'next/server';
import { prisma } from '../../lib/db';
import { requireAdmin, json, badRequest } from '../../lib/auth';

// GET - List classes
export async function GET() {
  try {
    const classes = await prisma.class.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { users: true } },
      },
    });
    return json(classes);
  } catch (error) {
    console.error('List classes error:', error);
    return json({ error: 'Failed to list classes' }, 500);
  }
}

// POST - Create class
export async function POST(request: NextRequest) {
  const user = requireAdmin(request);
  if (!user) return requireAdmin(request) as any;

  try {
    const { name } = await request.json();
    if (!name) return badRequest('name is required');

    const classData = await prisma.class.create({
      data: { name },
    });

    return json(classData);
  } catch (error) {
    console.error('Create class error:', error);
    return json({ error: 'Failed to create class' }, 500);
  }
}
