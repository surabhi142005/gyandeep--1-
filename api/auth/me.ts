/**
 * api/auth/me.ts
 * GET /api/auth/me
 */

import { NextRequest } from 'next/server';
import { prisma } from '../../lib/db';
import { requireAuth, json, unauthorized } from '../../lib/auth';

export async function GET(request: NextRequest) {
  const user = requireAuth(request);
  if (!user) return unauthorized();

  try {
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        faceImage: true,
        classId: true,
        assignedSubjects: true,
        preferences: true,
      },
    });

    if (!dbUser) return unauthorized('User not found');

    return json(dbUser);
  } catch (error) {
    console.error('Get user error:', error);
    return json({ error: 'Failed to get user' }, 500);
  }
}
