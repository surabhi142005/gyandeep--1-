/**
 * server/websocket.js
 * WebSocket server for bidirectional real-time communication
 */

import { WebSocketServer, WebSocket } from 'ws';
import jwt from 'jsonwebtoken';
import { URL } from 'url';
import { setAuthCookies, clearAuthCookies } from './middleware/auth.js';

const JWT_SECRET = process.env.JWT_SECRET || 'gyandeep-secret-key';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET + '_refresh';

const clients = new Map();
const rooms = new Map();

export function setupWebSocket(server) {
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', async (ws, req) => {
    let user = null;
    let clientId = generateClientId();

    try {
      const token = extractToken(req);
      if (token) {
        user = jwt.verify(token, JWT_SECRET);
      }
    } catch (error) {
      console.warn('WebSocket auth failed:', error.message);
    }

    const clientInfo = {
      id: clientId,
      ws,
      user,
      userId: user?.id,
      rooms: new Set(),
      connectedAt: new Date(),
      lastPing: Date.now(),
    };

    clients.set(clientId, clientInfo);

    if (user) {
      console.log(`WebSocket connected: ${user.email} (${clientId})`);
      joinRoom(clientId, `user:${user.id}`);
    } else {
      console.log(`WebSocket connected: anonymous (${clientId})`);
    }

    ws.on('message', (data) => handleMessage(clientId, data));
    ws.on('close', () => handleDisconnect(clientId));
    ws.on('error', (error) => handleError(clientId, error));
    ws.on('pong', () => {
      const client = clients.get(clientId);
      if (client) client.lastPing = Date.now();
    });

    send(clientId, {
      type: 'connected',
      clientId,
      user: user ? { id: user.id, email: user.email, role: user.role } : null,
      timestamp: new Date().toISOString(),
    });
  });

  setInterval(() => {
    clients.forEach((client, clientId) => {
      if (Date.now() - client.lastPing > 30000) {
        client.ws.ping();
      }
    });
  }, 15000);

  console.log('WebSocket server initialized');
  return wss;
}

function extractToken(req) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  return url.searchParams.get('token');
}

function generateClientId() {
  return `ws_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

function handleMessage(clientId, data) {
  try {
    const message = JSON.parse(data.toString());
    const client = clients.get(clientId);

    if (!client) return;

    switch (message.type) {
      case 'ping':
        send(clientId, { type: 'pong', timestamp: Date.now() });
        break;

      case 'join':
        if (message.room) {
          leaveAllRooms(clientId);
          joinRoom(clientId, message.room);
        }
        break;

      case 'leave':
        if (message.room) {
          leaveRoom(clientId, message.room);
        }
        break;

      case 'broadcast':
        if (message.room && message.data) {
          broadcastToRoom(message.room, {
            type: 'broadcast',
            from: clientId,
            ...message.data,
          }, clientId);
        }
        break;

      case 'emit':
        if (message.event && message.data !== undefined) {
          emit(clientId, message.event, message.data);
        }
        break;

      case 'subscribe':
        if (message.events && Array.isArray(message.events)) {
          message.events.forEach(event => {
            client.subscribedEvents = client.subscribedEvents || new Set();
            client.subscribedEvents.add(event);
          });
          send(clientId, {
            type: 'subscribed',
            events: Array.from(client.subscribedEvents),
          });
        }
        break;

      case 'typing':
        if (message.room && client.user) {
          broadcastToRoom(message.room, {
            type: 'user_typing',
            userId: client.user.id,
            userName: client.user.name,
            isTyping: message.isTyping,
          }, clientId);
        }
        break;

      case 'presence':
        if (message.room) {
          updatePresence(clientId, message.room, message.status);
        }
        break;

      default:
        console.warn(`Unknown message type: ${message.type}`);
    }
  } catch (error) {
    console.error('WebSocket message error:', error);
    send(clientId, { type: 'error', message: 'Invalid message format' });
  }
}

function handleDisconnect(clientId) {
  const client = clients.get(clientId);
  if (client) {
    if (client.user) {
      console.log(`WebSocket disconnected: ${client.user.email} (${clientId})`);
      broadcastToRoom(`user:${client.user.id}`, {
        type: 'user_offline',
        userId: client.user.id,
      }, clientId);
    } else {
      console.log(`WebSocket disconnected: anonymous (${clientId})`);
    }

    leaveAllRooms(clientId);
    clients.delete(clientId);
  }
}

function handleError(clientId, error) {
  console.error(`WebSocket error for ${clientId}:`, error);
}

function joinRoom(clientId, room) {
  const client = clients.get(clientId);
  if (!client) return;

  if (!rooms.has(room)) {
    rooms.set(room, new Set());
  }
  rooms.get(room).add(clientId);
  client.rooms.add(room);

  send(clientId, { type: 'joined', room });

  const roomClients = rooms.get(room);
  const users = Array.from(roomClients)
    .map(id => clients.get(id))
    .filter(c => c?.user)
    .map(c => ({ id: c.user.id, name: c.user.name, role: c.user.role }));

  send(clientId, { type: 'room_members', room, users, count: roomClients.size });

  if (client.user) {
    broadcastToRoom(room, {
      type: 'user_joined',
      userId: client.user.id,
      userName: client.user.name,
      total: roomClients.size,
    }, clientId);
  }
}

function leaveRoom(clientId, room) {
  const client = clients.get(clientId);
  if (!client) return;

  const roomClients = rooms.get(room);
  if (roomClients) {
    roomClients.delete(clientId);
    client.rooms.delete(room);

    if (roomClients.size === 0) {
      rooms.delete(room);
    } else {
      broadcastToRoom(room, {
        type: 'user_left',
        userId: client.user?.id,
        userName: client.user?.name,
        total: roomClients.size,
      }, clientId);
    }
  }

  send(clientId, { type: 'left', room });
}

function leaveAllRooms(clientId) {
  const client = clients.get(clientId);
  if (!client) return;

  client.rooms.forEach(room => {
    const roomClients = rooms.get(room);
    if (roomClients) {
      roomClients.delete(clientId);
      if (roomClients.size === 0) {
        rooms.delete(room);
      } else {
        broadcastToRoom(room, {
          type: 'user_left',
          userId: client.user?.id,
          total: roomClients.size,
        }, clientId);
      }
    }
  });

  client.rooms.clear();
}

function broadcastToRoom(room, message, excludeClientId = null) {
  const roomClients = rooms.get(room);
  if (!roomClients) return;

  const data = JSON.stringify(message);
  roomClients.forEach(clientId => {
    if (clientId !== excludeClientId) {
      const client = clients.get(clientId);
      if (client?.ws?.readyState === WebSocket.OPEN) {
        client.ws.send(data);
      }
    }
  });
}

function send(clientId, message) {
  const client = clients.get(clientId);
  if (client?.ws?.readyState === WebSocket.OPEN) {
    client.ws.send(JSON.stringify(message));
  }
}

function emit(clientId, event, data) {
  broadcastToUser(clientId, { type: 'event', event, data });
}

function broadcastToUser(clientId, message) {
  const client = clients.get(clientId);
  if (client?.ws?.readyState === WebSocket.OPEN) {
    client.ws.send(JSON.stringify(message));
  }
}

function updatePresence(clientId, room, status) {
  const client = clients.get(clientId);
  if (!client || !client.user) return;

  broadcastToRoom(room, {
    type: 'presence_update',
    userId: client.user.id,
    status,
    timestamp: new Date().toISOString(),
  }, clientId);
}

export function broadcast(event, data, room = null) {
  if (room) {
    broadcastToRoom(room, { type: 'event', event, data });
  } else {
    const message = JSON.stringify({ type: 'event', event, data });
    clients.forEach(client => {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(message);
      }
    });
  }
}

export function broadcastToUserById(userId, event, data) {
  broadcastToRoom(`user:${userId}`, { type: 'event', event, data });
}

export function getConnectedClients() {
  return Array.from(clients.values()).map(c => ({
    id: c.id,
    userId: c.user?.id,
    email: c.user?.email,
    role: c.user?.role,
    rooms: Array.from(c.rooms),
    connectedAt: c.connectedAt,
  }));
}

export function getRoomInfo(room) {
  const roomClients = rooms.get(room);
  if (!roomClients) return null;

  return {
    room,
    count: roomClients.size,
    clients: Array.from(roomClients).map(id => {
      const client = clients.get(id);
      return client?.user ? { id: client.user.id, name: client.user.name } : { id };
    }),
  };
}
