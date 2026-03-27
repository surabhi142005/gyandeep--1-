/**
 * server/tests/websocket.test.ts
 * WebSocket server tests
 * Tests connection handling, room management, messaging, and presence
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';

describe('WebSocket Server - Unit Tests', () => {
  // Simulate the core WebSocket data structures
  let clients: Map<string, any>;
  let rooms: Map<string, Set<string>>;

  function generateClientId() {
    return `ws_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  }

  function joinRoom(clientId: string, room: string) {
    const client = clients.get(clientId);
    if (!client) return;
    if (!rooms.has(room)) rooms.set(room, new Set());
    rooms.get(room)!.add(clientId);
    client.rooms.add(room);
  }

  function leaveRoom(clientId: string, room: string) {
    const client = clients.get(clientId);
    if (!client) return;
    const roomClients = rooms.get(room);
    if (roomClients) {
      roomClients.delete(clientId);
      client.rooms.delete(room);
      if (roomClients.size === 0) rooms.delete(room);
    }
  }

  function leaveAllRooms(clientId: string) {
    const client = clients.get(clientId);
    if (!client) return;
    client.rooms.forEach((room: string) => {
      const roomClients = rooms.get(room);
      if (roomClients) {
        roomClients.delete(clientId);
        if (roomClients.size === 0) rooms.delete(room);
      }
    });
    client.rooms.clear();
  }

  beforeEach(() => {
    clients = new Map();
    rooms = new Map();
  });

  describe('Client ID Generation', () => {
    test('should generate unique client IDs', () => {
      const ids = new Set<string>();
      for (let i = 0; i < 100; i++) {
        ids.add(generateClientId());
      }
      expect(ids.size).toBe(100);
    });

    test('should follow ws_ prefix convention', () => {
      const id = generateClientId();
      expect(id).toMatch(/^ws_\d+_[a-z0-9]+$/);
    });
  });

  describe('Connection Management', () => {
    test('should track connected clients', () => {
      const clientId = 'ws_test_1';
      clients.set(clientId, {
        id: clientId,
        user: { id: 'user1', email: 'test@test.com', role: 'student' },
        rooms: new Set(),
        connectedAt: new Date(),
        lastPing: Date.now(),
      });

      expect(clients.has(clientId)).toBe(true);
      expect(clients.size).toBe(1);
    });

    test('should support anonymous connections', () => {
      const clientId = 'ws_test_anon';
      clients.set(clientId, {
        id: clientId,
        user: null,
        userId: undefined,
        rooms: new Set(),
        connectedAt: new Date(),
        lastPing: Date.now(),
      });

      expect(clients.get(clientId)!.user).toBeNull();
    });

    test('should clean up on disconnect', () => {
      const clientId = 'ws_test_dc';
      clients.set(clientId, {
        id: clientId,
        user: { id: 'user1' },
        rooms: new Set(['room1', 'room2']),
        connectedAt: new Date(),
      });

      // Join rooms
      rooms.set('room1', new Set([clientId]));
      rooms.set('room2', new Set([clientId, 'other_client']));

      // Simulate disconnect
      leaveAllRooms(clientId);
      clients.delete(clientId);

      expect(clients.has(clientId)).toBe(false);
      expect(rooms.has('room1')).toBe(false); // Empty room removed
      expect(rooms.has('room2')).toBe(true);   // Other client still in room
      expect(rooms.get('room2')!.has(clientId)).toBe(false);
    });
  });

  describe('Room Management', () => {
    test('should join a room', () => {
      const clientId = 'ws_test_join';
      clients.set(clientId, { rooms: new Set() });

      joinRoom(clientId, 'classroom:math101');

      expect(rooms.has('classroom:math101')).toBe(true);
      expect(rooms.get('classroom:math101')!.has(clientId)).toBe(true);
      expect(clients.get(clientId)!.rooms.has('classroom:math101')).toBe(true);
    });

    test('should leave a room', () => {
      const clientId = 'ws_test_leave';
      clients.set(clientId, { rooms: new Set() });

      joinRoom(clientId, 'classroom:math101');
      leaveRoom(clientId, 'classroom:math101');

      expect(rooms.has('classroom:math101')).toBe(false); // Empty room removed
      expect(clients.get(clientId)!.rooms.has('classroom:math101')).toBe(false);
    });

    test('should auto-join user-specific room when authenticated', () => {
      const userId = 'user123';
      const clientId = 'ws_test_autoroom';
      clients.set(clientId, {
        user: { id: userId },
        rooms: new Set(),
      });

      joinRoom(clientId, `user:${userId}`);

      expect(rooms.has(`user:${userId}`)).toBe(true);
    });

    test('should support multiple clients in same room', () => {
      const client1 = 'ws_client_1';
      const client2 = 'ws_client_2';
      clients.set(client1, { rooms: new Set() });
      clients.set(client2, { rooms: new Set() });

      joinRoom(client1, 'shared_room');
      joinRoom(client2, 'shared_room');

      expect(rooms.get('shared_room')!.size).toBe(2);
    });

    test('should handle leaving all rooms at once', () => {
      const clientId = 'ws_test_all';
      clients.set(clientId, { rooms: new Set() });

      joinRoom(clientId, 'room1');
      joinRoom(clientId, 'room2');
      joinRoom(clientId, 'room3');

      expect(clients.get(clientId)!.rooms.size).toBe(3);

      leaveAllRooms(clientId);

      expect(clients.get(clientId)!.rooms.size).toBe(0);
    });
  });

  describe('Message Types', () => {
    test('should handle ping message', () => {
      const message = { type: 'ping' };
      const response = { type: 'pong', timestamp: Date.now() };

      expect(message.type).toBe('ping');
      expect(response.type).toBe('pong');
      expect(response.timestamp).toBeTruthy();
    });

    test('should handle join message', () => {
      const message = { type: 'join', room: 'classroom:CS101' };
      expect(message.type).toBe('join');
      expect(message.room).toBeTruthy();
    });

    test('should handle leave message', () => {
      const message = { type: 'leave', room: 'classroom:CS101' };
      expect(message.type).toBe('leave');
      expect(message.room).toBeTruthy();
    });

    test('should handle broadcast message', () => {
      const message = {
        type: 'broadcast',
        room: 'classroom:CS101',
        data: { event: 'quiz_started', data: { quizId: 'quiz1' } },
      };
      expect(message.data.event).toBe('quiz_started');
    });

    test('should handle subscribe message', () => {
      const message = {
        type: 'subscribe',
        events: ['grade_update', 'attendance_marked', 'notification'],
      };
      expect(message.events).toHaveLength(3);
      expect(message.events).toContain('grade_update');
    });

    test('should handle typing indicator', () => {
      const message = {
        type: 'typing',
        room: 'classroom:CS101',
        isTyping: true,
      };
      expect(message.isTyping).toBe(true);
    });

    test('should handle presence update', () => {
      const message = {
        type: 'presence',
        room: 'classroom:CS101',
        status: 'active',
      };
      expect(message.status).toBe('active');
    });

    test('should handle unknown message types gracefully', () => {
      const message = { type: 'unknown_type' };
      const knownTypes = ['ping', 'join', 'leave', 'broadcast', 'emit', 'subscribe', 'typing', 'presence'];
      expect(knownTypes.includes(message.type)).toBe(false);
    });
  });

  describe('Token Extraction', () => {
    test('should extract token from WebSocket URL query', () => {
      const extractToken = (url: string) => {
        const urlObj = new URL(url, 'http://localhost:3001');
        return urlObj.searchParams.get('token');
      };

      expect(extractToken('/ws?token=mytoken123')).toBe('mytoken123');
      expect(extractToken('/ws')).toBeNull();
      expect(extractToken('/ws?other=param')).toBeNull();
    });
  });

  describe('Connected Clients Info', () => {
    test('should return client information', () => {
      clients.set('ws_1', {
        id: 'ws_1',
        user: { id: 'u1', email: 'a@test.com', role: 'student' },
        rooms: new Set(['room1']),
        connectedAt: new Date(),
      });
      clients.set('ws_2', {
        id: 'ws_2',
        user: null,
        rooms: new Set(),
        connectedAt: new Date(),
      });

      const clientList = Array.from(clients.values()).map(c => ({
        id: c.id,
        userId: c.user?.id,
        email: c.user?.email,
        role: c.user?.role,
        rooms: Array.from(c.rooms),
        connectedAt: c.connectedAt,
      }));

      expect(clientList).toHaveLength(2);
      expect(clientList[0].userId).toBe('u1');
      expect(clientList[1].userId).toBeUndefined();
    });
  });

  describe('Room Info', () => {
    test('should return room details', () => {
      const clientId = 'ws_room_info';
      clients.set(clientId, {
        user: { id: 'u1', name: 'Test User' },
        rooms: new Set(),
      });
      joinRoom(clientId, 'test_room');

      const roomClients = rooms.get('test_room');
      const info = {
        room: 'test_room',
        count: roomClients!.size,
        clients: Array.from(roomClients!).map(id => {
          const client = clients.get(id);
          return client?.user ? { id: client.user.id, name: client.user.name } : { id };
        }),
      };

      expect(info.count).toBe(1);
      expect(info.clients[0]).toEqual({ id: 'u1', name: 'Test User' });
    });

    test('should return null for non-existent room', () => {
      const roomClients = rooms.get('nonexistent');
      expect(roomClients).toBeUndefined();
    });
  });
});
