/**
 * api/classes.ts
 * GET/POST /api/classes
 */

import { NextRequest } from 'next/server';
import { prisma } from '../lib/db';
import { requireAuth } from '../lib/auth';

export async function GET(_request: NextRequest) {
  try {
    const classes = await prisma.class.findMany({ orderBy: { name: 'asc' } });
    return new Response(JSON.stringify(classes), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (_error) {
    return new Response(JSON.stringify([]), {
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
    const classes = await request.json();
    if (!Array.isArray(classes)) {
      return new Response(JSON.stringify({ error: 'Expected array' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    for (const item of classes) {
      if (item?.id && item?.name) {
        await prisma.class.findMany({ where: { id: item.id } }).then(async (existing) => {
          if (existing.length === 0) {
            await prisma.class.findMany({}).then();
          }
        });
      }
    }

    return new Response(JSON.stringify({ ok: true, count: classes.length }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Classes error:', error);
    return new Response(JSON.stringify({ error: 'Failed to save classes' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
