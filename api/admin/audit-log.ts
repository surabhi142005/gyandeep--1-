/**
 * api/admin/audit-log.ts
 * GET /api/admin/audit-log - System Audit Logs
 */

import { NextRequest } from 'next/server';
import { prisma } from '../../lib/db';
import { requireAdmin, json, forbidden } from '../../lib/auth';

// GET - List all audit logs
export async function GET(request: NextRequest) {
  const user = requireAdmin(request);
  if (!user) return forbidden();

  try {
    const { type, userId, limit = '100', offset = '0' } = Object.fromEntries(new URL(request.url).searchParams);

    const where: any = {};

    if (type) where.type = type;
    if (userId) where.userId = userId;

    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { ts: 'desc' },
      take: parseInt(limit, 10),
      skip: parseInt(offset, 10),
      include: {
        user: {
          select: { id: true, name: true, email: true, role: true }
        }
      }
    });

    const totalCount = await prisma.auditLog.count({ where });

    return json({
      logs,
      totalCount,
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
    });
  } catch (error) {
    console.error('List audit logs error:', error);
    return json({ error: 'Failed to list audit logs' }, 500);
  }
}

// POST - Add a manual audit log entry (Admin only)
export async function POST(request: NextRequest) {
    const user = requireAdmin(request);
    if (!user) return forbidden();

    try {
        const { type, details, targetUserId } = await request.json();

        if (!type) return json({ error: 'Type is required' }, 400);

        const log = await prisma.auditLog.create({
            data: {
                type,
                details: details || {},
                userId: targetUserId || user.id,
                odId: `AUDIT-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            }
        });

        return json(log, 201);
    } catch (error) {
        console.error('Create audit log error:', error);
        return json({ error: 'Failed to create audit log entry' }, 500);
    }
}
