/**
 * api/auth/login.ts
 * POST /api/auth/login
 */

import { NextRequest } from 'next/server';
import { prisma } from '../../lib/db';
import { signToken, badRequest, json } from '../../lib/auth';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return badRequest('Email and password are required');
    }

    // Find user
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return json({ error: 'Invalid credentials' }, 401);
    }

    // Check password
    if (!user.password) {
      return json({ error: 'Please use OAuth login' }, 401);
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return json({ error: 'Invalid credentials' }, 401);
    }

    // Check if active
    if (!user.active) {
      return json({ error: 'Account is deactivated' }, 403);
    }

    // Generate token
    const token = signToken({
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name || '',
    });

    return json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        faceImage: user.faceImage,
        classId: user.classId,
        assignedSubjects: user.assignedSubjects,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return json({ error: 'Login failed' }, 500);
  }
}
