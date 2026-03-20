/**
 * server/routes/events.js
 * Server-Sent Events (SSE) endpoint for real-time updates
 */

import express from 'express';
const router = express.Router();

const clients = new Map();
let clientIdCounter = 0;

function broadcast(event, data) {
  const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  
  for (const [id, res] of clients) {
    try {
      res.write(message);
    } catch (err) {
      console.error(`SSE broadcast error for client ${id}:`, err);
      clients.delete(id);
    }
  }
}

function getClientCount() {
  return clients.size;
}

router.get('/', (req, res) => {
  const clientId = ++clientIdCounter;
  
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  const keepAlive = setInterval(() => {
    try {
      res.write(': keepalive\n\n');
    } catch (err) {
      clearInterval(keepAlive);
      clients.delete(clientId);
    }
  }, 30000);

  clients.set(clientId, res);
  
  console.log(`SSE client connected: ${clientId}. Total clients: ${getClientCount()}`);

  res.on('close', () => {
    clearInterval(keepAlive);
    clients.delete(clientId);
    console.log(`SSE client disconnected: ${clientId}. Total clients: ${getClientCount()}`);
  });

  res.on('error', (err) => {
    clearInterval(keepAlive);
    clients.delete(clientId);
    console.error(`SSE client error: ${clientId}`, err);
  });

  res.write(`event: connected\ndata: ${JSON.stringify({ clientId, message: 'Connected to SSE stream' })}\n\n`);
});

router.post('/grades', (req, res) => {
  const { type, id, count } = req.body;
  
  broadcast('grades_update', {
    type,
    id,
    count,
    timestamp: new Date().toISOString(),
  });
  
  res.json({ ok: true, clientsNotified: getClientCount() });
});

router.post('/timetable', (req, res) => {
  const { type, id } = req.body;
  
  broadcast('timetable_update', {
    type,
    id,
    timestamp: new Date().toISOString(),
  });
  
  res.json({ ok: true, clientsNotified: getClientCount() });
});

router.post('/tickets', (req, res) => {
  const { type, id, assignedToId } = req.body;
  
  broadcast('tickets_update', {
    type,
    id,
    assignedToId,
    timestamp: new Date().toISOString(),
  });
  
  res.json({ ok: true, clientsNotified: getClientCount() });
});

router.post('/attendance', (req, res) => {
  const { sessionId, studentId, status } = req.body;
  
  broadcast('attendance_update', {
    sessionId,
    studentId,
    status,
    timestamp: new Date().toISOString(),
  });
  
  res.json({ ok: true, clientsNotified: getClientCount() });
});

router.post('/announcements', (req, res) => {
  const { id, title, message } = req.body;
  
  broadcast('announcement', {
    id,
    title,
    message,
    timestamp: new Date().toISOString(),
  });
  
  res.json({ ok: true, clientsNotified: getClientCount() });
});

router.post('/notification', (req, res) => {
  const { userId, notification } = req.body;
  
  broadcast('notification', {
    userId,
    ...notification,
    timestamp: new Date().toISOString(),
  });
  
  res.json({ ok: true, clientsNotified: getClientCount() });
});

router.post('/broadcast', (req, res) => {
  const { event, data } = req.body;
  
  if (!event) {
    return res.status(400).json({ error: 'Event type is required' });
  }
  
  broadcast(event, {
    ...data,
    timestamp: new Date().toISOString(),
  });
  
  res.json({ ok: true, clientsNotified: getClientCount() });
});

router.get('/status', (req, res) => {
  res.json({
    connected: getClientCount(),
    serverTime: new Date().toISOString(),
  });
});

export default router;
export { broadcast, getClientCount };
