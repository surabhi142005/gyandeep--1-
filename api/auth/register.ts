/**
 * api/auth/register.ts
 * POST /api/auth/register
 */

import { NextRequest } from 'next/server';
import { prisma } from '../../lib/db';
import { signToken, badRequest, json, unauthorized } from '../../lib/auth';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const { name, email, password, role = 'student' } = await request.json();

    if (!email || !password) {
      return badRequest('Email and password are required');
    }

    // Check if user exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return badRequest('Email already registered');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        name: name || email.split('@')[0],
        email,
        password: hashedPassword,
        role: ['student', 'teacher', 'admin'].includes(role) ? role : 'student',
      },
    });

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
      },
    });
  } catch (error) {
    console.error('Register error:', error);
    return json({ error: 'Registration failed' }, 500);
  }
}
