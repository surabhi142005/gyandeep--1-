/**
 * server/routes/email.js
 * Generic email notification route used by the admin dashboard
 */

import express from 'express';
import emailService from '../services/emailService.js';

const router = express.Router();

router.post('/email-notification', async (req, res) => {
  try {
    const { to, subject, html } = req.body || {};
    if (!to || !subject || !html) {
      return res.status(400).json({ error: 'to, subject, and html are required' });
    }

    const result = await emailService.sendEmail({ to, subject, html });
    res.json({ ok: true, provider: result?.provider || 'unknown', messageId: result?.messageId });
  } catch (error) {
    console.error('Email notification error:', error);
    res.status(500).json({ error: 'Failed to send email notification' });
  }
});

export default router;
