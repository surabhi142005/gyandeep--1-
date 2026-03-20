/**
 * server/routes/admin.js
 * Admin routes including email health check
 */

import express from 'express';
const router = express.Router();
import { connectToDatabase, COLLECTIONS } from '../db/mongoAtlas.js';

router.get('/email/health', async (req, res) => {
  try {
    const emailConfigured = !!(
      process.env.SMTP_HOST ||
      process.env.SENDGRID_API_KEY ||
      process.env.RESEND_API_KEY
    );

    res.json({
      ok: true,
      configured: emailConfigured,
      provider: process.env.SMTP_HOST ? 'smtp' : 
                process.env.SENDGRID_API_KEY ? 'sendgrid' : 
                process.env.RESEND_API_KEY ? 'resend' : 'none',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Email health check error:', error);
    res.status(500).json({ error: 'Failed to check email service' });
  }
});

router.get('/stats', async (req, res) => {
  try {
    const db = await connectToDatabase();
    
    const [users, classes, grades, tickets] = await Promise.all([
      db.collection(COLLECTIONS.USERS).countDocuments(),
      db.collection(COLLECTIONS.CLASSES).countDocuments(),
      db.collection(COLLECTIONS.GRADES).countDocuments(),
      db.collection(COLLECTIONS.TICKETS).countDocuments({ status: 'open' }),
    ]);

    res.json({
      users,
      classes,
      grades,
      openTickets: tickets,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

export default router;
