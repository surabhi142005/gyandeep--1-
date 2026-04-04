import express from 'express';
const router = express.Router();
import { connectToDatabase } from '../db/mongoAtlas.js';
import { authMiddleware } from '../middleware/auth.js';

router.get('/', authMiddleware, async (req, res) => {
  try {
    const db = await connectToDatabase();
    const { type, startDate, endDate, page, limit } = req.query;
    
    const filter = {};
    
    if (type && type !== 'all') {
      filter.type = type;
    }
    
    if (startDate || endDate) {
      filter.ts = {};
      if (startDate) {
        filter.ts.$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.ts.$lte = end;
      }
    }
    
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 50;
    const skip = (pageNum - 1) * limitNum;
    
    const [logs, total] = await Promise.all([
      db.collection('audit_logs')
        .aggregate([
          { $match: filter },
          { $sort: { ts: -1 } },
          { $skip: skip },
          { $limit: limitNum },
          {
            $lookup: {
              from: 'users',
              localField: 'userId',
              foreignField: '_id',
              as: 'user',
            },
          },
          { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
          {
            $project: {
              id: '$_id',
              odId: 1,
              ts: 1,
              type: 1,
              userId: 1,
              details: 1,
              'user.name': 1,
              'user.email': 1,
              'user.role': 1,
            },
          },
        ])
        .toArray(),
      db.collection('audit_logs').countDocuments(filter),
    ]);
    
    res.json({
      logs,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    console.error('Audit logs fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

router.get('/stats', async (req, res) => {
  try {
    const db = await connectToDatabase();
    const days = parseInt(req.query.days, 10) || 7;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const [stats, recentTypes] = await Promise.all([
      db.collection('audit_logs')
        .aggregate([
          { $match: { ts: { $gte: startDate } } },
          {
            $group: {
              _id: '$type',
              count: { $sum: 1 },
            },
          },
          { $sort: { count: -1 } },
        ])
        .toArray(),
      db.collection('audit_logs')
        .aggregate([
          { $match: { ts: { $gte: startDate } } },
          {
            $group: {
              _id: {
                $dateToString: { format: '%Y-%m-%d', date: '$ts' },
              },
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ])
        .toArray(),
    ]);
    
    res.json({
      stats: stats.map((s) => ({ type: s._id, count: s.count })),
      timeline: recentTypes,
      period: `${days} days`,
      startDate: startDate.toISOString(),
    });
  } catch (error) {
    console.error('Audit stats error:', error);
    res.status(500).json({ error: 'Failed to fetch audit stats' });
  }
});

router.get('/export', async (req, res) => {
  try {
    const db = await connectToDatabase();
    const { type, startDate, endDate, format } = req.query;
    
    const filter = {};
    
    if (type && type !== 'all') {
      filter.type = type;
    }
    
    if (startDate || endDate) {
      filter.ts = {};
      if (startDate) {
        filter.ts.$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.ts.$lte = end;
      }
    }
    
    const logs = await db.collection('audit_logs')
      .find(filter)
      .sort({ ts: -1 })
      .limit(10000)
      .toArray();
    
    if (format === 'csv') {
      const headers = ['ID', 'Type', 'User ID', 'Details', 'Timestamp'];
      const rows = logs.map((log) => [
        log.odId || log._id.toString(),
        log.type,
        log.userId || '',
        JSON.stringify(log.details || {}),
        log.ts.toISOString(),
      ]);
      
      const csv = [headers.join(','), ...rows.map((r) => r.map((c) => `"${c}"`).join(','))].join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=audit-logs-${new Date().toISOString().split('T')[0]}.csv`);
      res.send(csv);
    } else {
      res.json({ logs });
    }
  } catch (error) {
    console.error('Audit export error:', error);
    res.status(500).json({ error: 'Failed to export audit logs' });
  }
});

export default router;
