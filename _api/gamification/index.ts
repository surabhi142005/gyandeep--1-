/**
 * api/gamification/index.ts
 * GET /api/gamification - Gamification & Activity History
 */

import { NextRequest } from 'next/server';
import { prisma } from '../../lib/db';
import { requireAuth, json, forbidden } from '../../lib/auth';

// GET - Get gamification status and activity history for current user
export async function GET(request: NextRequest) {
  const user = requireAuth(request);
  if (!user) return forbidden();

  try {
    const { limit = '20' } = Object.fromEntries(new URL(request.url).searchParams);

    // Get user's current gamification status
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        xp: true,
        coins: true,
        level: true,
        streak: true,
      }
    });

    // Get recent activities
    const activities = await prisma.activityLog.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit, 10),
    });

    // Get leaderboard (Top 10 users by XP)
    const leaderboard = await prisma.user.findMany({
      orderBy: { xp: 'desc' },
      take: 10,
      select: {
        id: true,
        name: true,
        xp: true,
        level: true,
        role: true,
      }
    });

    return json({
      stats: dbUser,
      activities,
      leaderboard,
    });
  } catch (error) {
    console.error('Gamification error:', error);
    return json({ error: 'Failed to get gamification data' }, 500);
  }
}

// POST - Record a manual activity (Admin only?)
// In a real app, activities are usually triggered by actions like quiz completion
export async function POST(request: NextRequest) {
    const user = requireAuth(request);
    if (!user || user.role !== 'admin') return forbidden();

    try {
        const { userId, type, xpEarned, details } = await request.json();

        if (!userId || !type || xpEarned === undefined) {
            return json({ error: 'userId, type, and xpEarned are required' }, 400);
        }

        // Create log entry
        const log = await prisma.activityLog.create({
            data: {
                userId,
                type,
                xpEarned,
                details: JSON.stringify(details || {}),
            }
        });

        // Update user stats
        await prisma.user.update({
            where: { id: userId },
            data: {
                xp: { increment: xpEarned },
                // Optional: handle level up logic here
            }
        });

        return json(log, 201);
    } catch (error) {
        console.error('Record activity error:', error);
        return json({ error: 'Failed to record activity' }, 500);
    }
}
