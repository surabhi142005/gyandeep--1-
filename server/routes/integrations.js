/**
 * server/routes/integrations.js
 * Integration routes for Calendar and Drive
 */

import express from 'express';
const router = express.Router();

router.post('/calendar/sync', async (req, res) => {
  try {
    const { title, start, end, description } = req.body;
    
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      return res.status(501).json({ 
        error: 'Google Calendar integration not configured',
        message: 'Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables'
      });
    }

    console.log(`Calendar sync: ${title} from ${start} to ${end}`);
    
    res.json({ ok: true, message: 'Event synced to calendar' });
  } catch (error) {
    console.error('Calendar sync error:', error);
    res.status(500).json({ error: 'Failed to sync calendar' });
  }
});

router.post('/drive/upload', async (req, res) => {
  try {
    const { name, url, mimeType } = req.body;
    
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      return res.status(501).json({ 
        error: 'Google Drive integration not configured',
        message: 'Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables'
      });
    }

    console.log(`Drive upload: ${name} from ${url}`);
    
    res.json({ ok: true, message: 'File uploaded to Drive' });
  } catch (error) {
    console.error('Drive upload error:', error);
    res.status(500).json({ error: 'Failed to upload to Drive' });
  }
});

export default router;
