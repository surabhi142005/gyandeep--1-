/**
 * server/routes/events.js
 * Server-Sent Events (SSE) endpoint for real-time updates
 * Integrated with broadcast service for unified real-time events
 */

import express from 'express';
const router = express.Router();
import { getConnectedClientsCount } from '../services/broadcast.js';

let clientIdCounter = 0;
const clientRooms = new Map();

function broadcastToRoom(room, event, data) {
  const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  
  for (const [clientId, clientData] of clientRooms) {
    if (clientData.rooms && clientData.rooms.has(room)) {
      try {
        clientData.res.write(message);
      } catch (err) {
        console.error(`SSE broadcast error for client ${clientId}:`, err);
        clientRooms.delete(clientId);
      }
    }
  }
}

function broadcastToUser(userId, event, data) {
  const message = `event: ${event}\ndata: ${JSON.stringify({ ...data, userId })}\n\n`;
  
  for (const [clientId, clientData] of clientRooms) {
    if (clientData.userId === userId) {
      try {
        clientData.res.write(message);
      } catch (err) {
        console.error(`SSE broadcast error for client ${clientId}:`, err);
        clientRooms.delete(clientId);
      }
    }
  }
}

function broadcastToAll(event, data) {
  broadcast(event, data);
}

function addClient(res, userId = null, rooms = new Set()) {
  const clientId = ++clientIdCounter;
  clientRooms.set(clientId, { res, userId, rooms });
  return clientId;
}

function removeClient(clientId) {
  clientRooms.delete(clientId);
}

function getClientCount() {
  return clientRooms.size;
}

function joinRoom(clientId, room) {
  const client = clientRooms.get(clientId);
  if (client) {
    if (!client.rooms) client.rooms = new Set();
    client.rooms.add(room);
  }
}

function leaveRoom(clientId, room) {
  const client = clientRooms.get(clientId);
  if (client && client.rooms) {
    client.rooms.delete(room);
  }
}

router.get('/', (req, res) => {
  const userId = req.query.userId || null;
  const clientId = addClient(res, userId);
  
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
      removeClient(clientId);
    }
  }, 30000);

  console.log(`SSE client connected: ${clientId}. Total clients: ${getClientCount()}`);

  res.on('close', () => {
    clearInterval(keepAlive);
    removeClient(clientId);
    console.log(`SSE client disconnected: ${clientId}. Total clients: ${getClientCount()}`);
  });

  res.on('error', (err) => {
    clearInterval(keepAlive);
    removeClient(clientId);
    console.error(`SSE client error: ${clientId}`, err);
  });

  res.write(`event: connected\ndata: ${JSON.stringify({ clientId, message: 'Connected to SSE stream' })}\n\n`);
});

router.post('/join-room', (req, res) => {
  const { clientId, room } = req.body;
  if (clientId && room) {
    joinRoom(clientId, room);
    res.json({ ok: true });
  } else {
    res.status(400).json({ error: 'clientId and room required' });
  }
});

router.post('/leave-room', (req, res) => {
  const { clientId, room } = req.body;
  if (clientId && room) {
    leaveRoom(clientId, room);
    res.json({ ok: true });
  } else {
    res.status(400).json({ error: 'clientId and room required' });
  }
});

router.post('/grades', (req, res) => {
  const { type, id, count, studentId } = req.body;
  
  const data = {
    type,
    id,
    count,
    timestamp: new Date().toISOString(),
  };
  
  if (studentId) {
    broadcastToUser(studentId, 'grades-changed', data);
  }
  broadcastToAll('grades-changed', data);
  
  res.json({ ok: true, clientsNotified: getConnectedClientsCount() });
});

router.post('/timetable', (req, res) => {
  const { type, id, userId } = req.body;
  
  const data = {
    type,
    id,
    timestamp: new Date().toISOString(),
  };
  
  if (userId) {
    broadcastToUser(userId, 'timetable-changed', data);
  }
  broadcastToAll('timetable-changed', data);
  
  res.json({ ok: true, clientsNotified: getConnectedClientsCount() });
});

router.post('/tickets', (req, res) => {
  const { type, id, assignedToId, userId } = req.body;
  
  const data = {
    type,
    id,
    assignedToId,
    timestamp: new Date().toISOString(),
  };
  
  if (assignedToId) {
    broadcastToUser(assignedToId, 'ticket-update', data);
  }
  if (userId) {
    broadcastToUser(userId, 'ticket-update', data);
  }
  broadcastToAll('tickets-changed', data);
  
  res.json({ ok: true, clientsNotified: getConnectedClientsCount() });
});

router.post('/attendance', (req, res) => {
  const { sessionId, studentId, status, room } = req.body;
  
  const data = {
    sessionId,
    studentId,
    status,
    timestamp: new Date().toISOString(),
  };
  
  if (studentId) {
    broadcastToUser(studentId, 'attendance-changed', data);
  }
  if (room) {
    broadcastToRoom(room, 'attendance-changed', data);
  }
  broadcastToAll('attendance-changed', data);
  
  res.json({ ok: true, clientsNotified: getConnectedClientsCount() });
});

router.post('/announcements', (req, res) => {
  const { id, title, message, classId, room } = req.body;
  
  const data = {
    id,
    title,
    message,
    classId,
    timestamp: new Date().toISOString(),
  };
  
  if (room) {
    broadcastToRoom(room, 'announcement', data);
  }
  broadcastToAll('announcement', data);
  
  res.json({ ok: true, clientsNotified: getConnectedClientsCount() });
});

router.post('/notification', (req, res) => {
  const { userId, notification } = req.body;
  
  if (userId && userId !== 'all') {
    broadcastToUser(userId, 'notification', { ...notification, timestamp: new Date().toISOString() });
  }
  if (userId === 'all') {
    broadcastToAll('notification', { ...notification, timestamp: new Date().toISOString() });
  }
  
  res.json({ ok: true, clientsNotified: getConnectedClientsCount() });
});

router.post('/session', (req, res) => {
  const { sessionId, type, room } = req.body;
  
  const data = {
    sessionId,
    type,
    timestamp: new Date().toISOString(),
  };
  
  if (room) {
    broadcastToRoom(room, 'session-update', data);
  }
  broadcastToAll('session-update', data);
  
  res.json({ ok: true, clientsNotified: getConnectedClientsCount() });
});

router.post('/quiz', (req, res) => {
  const { sessionId, type, questionIndex, room, studentId } = req.body;
  
  const data = {
    sessionId,
    type,
    questionIndex,
    timestamp: new Date().toISOString(),
  };
  
  if (room) {
    broadcastToRoom(room, 'quiz-update', data);
  }
  if (studentId) {
    broadcastToUser(studentId, 'quiz-update', data);
  }
  broadcastToAll('quiz-update', data);
  
  res.json({ ok: true, clientsNotified: getConnectedClientsCount() });
});

router.post('/broadcast', (req, res) => {
  const { event, data, room, userId } = req.body;
  
  if (!event) {
    return res.status(400).json({ error: 'Event type is required' });
  }
  
  if (room) {
    broadcastToRoom(room, event, { ...data, timestamp: new Date().toISOString() });
  } else if (userId) {
    broadcastToUser(userId, event, { ...data, timestamp: new Date().toISOString() });
  } else {
    broadcastToAll(event, { ...data, timestamp: new Date().toISOString() });
  }
  
  res.json({ ok: true, clientsNotified: getConnectedClientsCount() });
});

router.get('/status', (req, res) => {
  res.json({
    connected: getClientCount(),
    totalBroadcastClients: getConnectedClientsCount(),
    serverTime: new Date().toISOString(),
  });
});

export default router;
export { 
  broadcastToAll, 
  broadcastToRoom, 
  broadcastToUser, 
  getClientCount,
  joinRoom,
  leaveRoom,
};
