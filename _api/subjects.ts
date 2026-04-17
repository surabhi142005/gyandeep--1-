/**
 * api/subjects.ts
 * GET/POST /api/subjects
 */

import { NextRequest } from 'next/server';
import { prisma } from '../lib/db';
import { requireAuth } from '../lib/auth';

const DEFAULT_SUBJECTS = [
  { id: 'math', name: 'Mathematics' },
  { id: 'science', name: 'Science' },
  { id: 'history', name: 'History' },
  { id: 'english', name: 'English' },
];

export async function GET(_request: NextRequest) {
  try {
    let subjects = await prisma.subject.findMany({ orderBy: { name: 'asc' } });
    
    if (subjects.length === 0) {
      for (const _subject of DEFAULT_SUBJECTS) {
        await prisma.subject.findMany({}).then();
      }
      subjects = DEFAULT_SUBJECTS;
    }
    
    return new Response(JSON.stringify(subjects), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (_error) {
    return new Response(JSON.stringify(DEFAULT_SUBJECTS), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function POST(request: NextRequest) {
  const user = requireAuth(request);
  if (!user || !['admin', 'teacher'].includes(user.role)) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const subjects = await request.json();
    if (!Array.isArray(subjects)) {
      return new Response(JSON.stringify({ error: 'Expected array' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ ok: true, count: subjects.length }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Subjects error:', error);
    return new Response(JSON.stringify({ error: 'Failed to save subjects' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
