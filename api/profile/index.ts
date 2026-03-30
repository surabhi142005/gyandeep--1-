/**
 * api/profile/index.ts
 * GET/PATCH /api/profile - User Profile Management
 */

import { NextRequest } from 'next/server';
import { prisma } from '../../lib/db';
import { requireAuth, json, forbidden, badRequest } from '../../lib/auth';
import bcrypt from 'bcryptjs';

// GET - Get user profile (redundant with /api/auth/me but more detailed)
export async function GET(request: NextRequest) {
  const user = requireAuth(request);
  if (!user) return forbidden();

  try {
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        class: { select: { id: true, name: true } },
        _count: {
          select: {
            quizAttempts: true,
            attendanceTaken: true,
            uploadedNotes: true,
          }
        }
      }
    });

    if (!dbUser) return json({ error: 'User not found' }, 404);

    // Remove sensitive data
    const { password, ...safeUser } = dbUser;
    return json(safeUser);
  } catch (error) {
    console.error('Get profile error:', error);
    return json({ error: 'Failed to get profile' }, 500);
  }
}

// PATCH - Update profile details
export async function PATCH(request: NextRequest) {
  const user = requireAuth(request);
  if (!user) return forbidden();

  try {
    const body = await request.json();
    const { name, currentPassword, newPassword, preferences, faceImage } = body;

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id }
    });
    if (!dbUser) return json({ error: 'User not found' }, 404);

    const updateData: any = {};

    if (name) updateData.name = name;
    if (preferences) updateData.preferences = preferences;
    if (faceImage) updateData.faceImage = faceImage;

    // Handle password change
    if (newPassword) {
      if (!currentPassword || !dbUser.password) {
        return badRequest('Current password is required to set a new one');
      }

      const isMatch = await bcrypt.compare(currentPassword, dbUser.password);
      if (!isMatch) {
        return badRequest('Incorrect current password');
      }

      updateData.password = await bcrypt.hash(newPassword, 10);
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: updateData
    });

    const { password, ...safeUpdated } = updated;
    return json(safeUpdated);
  } catch (error) {
    console.error('Update profile error:', error);
    return json({ error: 'Failed to update profile' }, 500);
  }
}
