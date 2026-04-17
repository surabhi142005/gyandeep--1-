/**
 * api/bootstrap.ts
 * GET /api/bootstrap - Get initial app data
 */

import { NextRequest } from 'next/server';
import { prisma } from '../lib/db';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const includeFaceImage = url.searchParams.get('includeFaceImage') === 'true';

    const [users, classes, subjects] = await Promise.all([
      prisma.user.findMany({ orderBy: { name: 'asc' } }),
      prisma.class.findMany({ orderBy: { name: 'asc' } }),
      prisma.subject.findMany({ orderBy: { name: 'asc' } }),
    ]);

    const sanitizeUser = (u: any) => ({
      id: u.id,
      name: u.name,
      role: u.role,
      email: u.email,
      faceImage: includeFaceImage ? u.faceImage : (u.faceImage ? 'data:image/jpeg;base64,***' : null),
      active: u.active !== false,
      emailVerified: !!u.emailVerified,
      preferences: u.preferences || {},
      history: u.history || [],
      assignedSubjects: u.assignedSubjects || [],
      performance: u.performance || [],
      classId: u.classId || null,
    });

    return new Response(JSON.stringify({
      setupComplete: users.length > 0,
      users: users.map(sanitizeUser),
      classes: classes || [],
      subjects: subjects || [],
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Bootstrap error:', error);
    return new Response(JSON.stringify({ error: 'Failed to load bootstrap data' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
