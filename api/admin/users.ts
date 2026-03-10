/**
 * api/admin/users.ts
 * GET/POST /api/admin/users - Manage users
 */

import { NextRequest } from 'next/server';
import { prisma } from '../../lib/db';
import { requireAdmin, json, badRequest } from '../../lib/auth';

// GET - List all users
export async function GET(request: NextRequest) {
  const user = requireAdmin(request);
  if (!user) return requireAdmin(request) as any;

  try {
    const { role, classId, search } = Object.fromEntries(new URL(request.url).searchParams);

    let where: any = {};

    if (role) where.role = role;
    if (classId) where.classId = classId;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const users = await prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        classId: true,
        assignedSubjects: true,
        createdAt: true,
      },
    });

    return json(users);
  } catch (error) {
    console.error('List users error:', error);
    return json({ error: 'Failed to list users' }, 500);
  }
}

// POST - Create user (admin only)
export async function POST(request: NextRequest) {
  const user = requireAdmin(request);
  if (!user) return requireAdmin(request) as any;

  try {
    const { name, email, password, role, classId, assignedSubjects } = await request.json();

    if (!email || !password || !name) {
      return badRequest('name, email, and password are required');
    }

    // Check if exists
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) {
      return badRequest('Email already registered');
    }

    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: ['student', 'teacher', 'admin'].includes(role) ? role : 'student',
        classId: classId || null,
        assignedSubjects: assignedSubjects || [],
      },
    });

    return json({
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
    });
  } catch (error) {
    console.error('Create user error:', error);
    return json({ error: 'Failed to create user' }, 500);
  }
}
