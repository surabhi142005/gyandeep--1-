/**
 * api/admin/subjects.ts
 * GET/POST /api/admin/subjects - Manage subjects
 */

import { NextRequest } from 'next/server';
import { prisma } from '../../lib/db';
import { requireAdmin, json, badRequest } from '../../lib/auth';

// GET - List subjects
export async function GET() {
  const user = requireAdmin({ headers: new Headers() } as NextRequest);
  if (!user) return requireAdmin({ headers: new Headers() } as NextRequest) as any;

  try {
    const subjects = await prisma.subject.findMany({
      orderBy: { name: 'asc' },
    });
    return json(subjects);
  } catch (error) {
    console.error('List subjects error:', error);
    return json({ error: 'Failed to list subjects' }, 500);
  }
}

// POST - Create subject
export async function POST(request: NextRequest) {
  const user = requireAdmin(request);
  if (!user) return requireAdmin(request) as any;

  try {
    const { name } = await request.json();
    if (!name) return badRequest('name is required');

    const subject = await prisma.subject.create({
      data: { name },
    });

    return json(subject);
  } catch (error) {
    console.error('Create subject error:', error);
    return json({ error: 'Failed to create subject' }, 500);
  }
}
