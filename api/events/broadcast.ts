/**
 * api/events/broadcast.ts
 * POST /api/events/broadcast - Broadcast event to all connected clients
 */

import { NextRequest } from 'next/server';
import { requireAuth } from '../../lib/auth';
import { COLLECTIONS } from '../../server/db/mongoAtlas';
import { connectToDatabase } from '../../server/db/mongoAtlas';

export async function POST(request: NextRequest) {
  const user = requireAuth(request);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const { event, payload } = await request.json();
    if (!event) {
      return new Response(JSON.stringify({ error: 'event is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Store event in MongoDB for polling clients
    const db = await connectToDatabase();
    await db.collection('events').insertOne({
      event,
      payload: payload || {},
      timestamp: Date.now(),
    });

    // Keep only last 100 events
    await db.collection('events').deleteMany({
      _id: { $nin: await db.collection('events').find().sort({ timestamp: -1 }).limit(100).toArray().then(arr => arr.map((d: any) => d._id)) }
    });

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Broadcast error:', error);
    return new Response(JSON.stringify({ error: 'Failed to broadcast' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
