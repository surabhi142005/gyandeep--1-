import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from './_lib/auth';

/**
 * Send custom notification emails via Resend.
 * For non-auth emails (announcements, grade reports, etc.)
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = await requireAuth(req);
  if (!user || (user.role !== 'teacher' && user.role !== 'admin')) {
    return res.status(403).json({ error: 'Only teachers and admins can send notifications' });
  }

  const { to, subject, html } = req.body || {};
  if (!to || !subject || !html) {
    return res.status(400).json({ error: 'to, subject, and html are required' });
  }

  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_API_KEY) {
    return res.status(500).json({ error: 'Email service not configured' });
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: 'Gyandeep <noreply@gyandeep.app>',
        to: Array.isArray(to) ? to : [to],
        subject,
        html
      })
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.message || 'Email send failed');
    }

    const data = await response.json();
    return res.status(200).json({ ok: true, id: data.id });
  } catch (error: any) {
    console.error('Email notification error:', error);
    return res.status(500).json({ error: error.message || 'Failed to send email' });
  }
}
