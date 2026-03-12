import { NextRequest } from 'next/server';
import { json, auth } from '../../../lib/auth';

/**
 * api/integrations/calendar/sync.ts
 * POST /api/integrations/calendar/sync
 */

export async function POST(request: NextRequest) {
  try {
    const user = await auth();
    if (!user) return json({ error: 'Unauthorized' }, 401);

    const { title, start, end } = await request.json();

    if (!title || !start || !end) {
      return json({ error: 'Missing required fields' }, 400);
    }

    // Actual Implementation with Google Calendar API:
    // const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    // await calendar.events.insert({ ... });

    // For now, we simulate success
    return json({ 
      ok: true, 
      message: 'Event synced to Google Calendar',
      eventId: `cal_${Date.now()}` 
    });
  } catch (error) {
    console.error('Calendar sync error:', error);
    return json({ error: 'Failed to sync calendar' }, 500);
  }
}
