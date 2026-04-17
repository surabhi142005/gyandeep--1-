/**
 * api/health.ts
 * GET /api/health - Health check endpoint
 */

import { NextRequest } from 'next/server';
import { connectToDatabase } from '../lib/db';

export async function GET(_request: NextRequest) {
  try {
    const db = await connectToDatabase();
    await db.collection('users').findOne({});
    
    return new Response(JSON.stringify({
      status: 'ok',
      db: 'connected',
      timestamp: new Date().toISOString(),
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Health check error:', error);
    return new Response(JSON.stringify({
      status: 'error',
      db: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
