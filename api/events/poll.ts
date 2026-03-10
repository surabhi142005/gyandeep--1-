/**
 * api/events/poll.ts
 * GET /api/events/poll - Polling fallback for serverless real-time updates
 */

import { NextRequest } from 'next/server';
import { verifyToken } from '../../lib/auth';
import { COLLECTIONS } from '../../server/db/mongoAtlas';
import { connectToDatabase } from '../../server/db/mongoAtlas';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '') || request.nextUrl.searchParams.get('token');
  
  if (!token) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    verifyToken(token);
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid token' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const since = parseInt(request.nextUrl.searchParams.get('since') || '0');
    const db = await connectToDatabase();
    
    const events = await db.collection('events')
      .find({ timestamp: { $gt: since } })
      .sort({ timestamp: 1 })
      .limit(50)
      .toArray();

    return new Response(JSON.stringify(events.map((e: any) => ({
      event: e.event,
      payload: e.payload,
      timestamp: e.timestamp,
    }))), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      }
    });
  } catch (error) {
    console.error('Poll error:', error);
    return new Response(JSON.stringify([]), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
