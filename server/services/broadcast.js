/**
 * server/services/broadcast.js
 * Centralized broadcast service for real-time events
 */

let broadcastClients = [];

export function addBroadcastClient(client) {
  broadcastClients.push(client);
}

export function removeBroadcastClient(client) {
  broadcastClients = broadcastClients.filter((c) => c !== client);
}

export function broadcastToAll(event, data) {
  const message = JSON.stringify({ event, payload: data });
  broadcastClients.forEach((client) => {
    try {
      client.write(`data: ${message}\n\n`);
    } catch (err) {
      console.error('Failed to broadcast to client:', err);
    }
  });
}

export function broadcastToUser(userId, event, data) {
  const message = JSON.stringify({ event, payload: { ...data, userId } });
  broadcastClients.forEach((client) => {
    if (client.userId === userId) {
      try {
        client.write(`data: ${message}\n\n`);
      } catch (err) {
        console.error('Failed to broadcast to user:', err);
      }
    }
  });
}

export function broadcastToRoom(room, event, data) {
  const message = JSON.stringify({ event, payload: { ...data, room } });
  broadcastClients.forEach((client) => {
    if (client.rooms && client.rooms.has(room)) {
      try {
        client.write(`data: ${message}\n\n`);
      } catch (err) {
        console.error('Failed to broadcast to room:', err);
      }
    }
  });
}

export function broadcastGradesUpdated(studentId, gradeData) {
  broadcastToUser(studentId, 'grades-changed', gradeData);
  broadcastToAll('grades-changed', gradeData);
}

export function broadcastAttendanceUpdated(studentId, attendanceData) {
  broadcastToUser(studentId, 'attendance-changed', attendanceData);
}

export function broadcastAnnouncement(announcementData) {
  broadcastToAll('announcement', announcementData);
}

export function broadcastTicketUpdate(ticketData) {
  broadcastToUser(ticketData.assignedToId, 'ticket-update', ticketData);
  broadcastToUser(ticketData.userId, 'ticket-update', ticketData);
}

export function broadcastSessionUpdate(sessionData) {
  broadcastToRoom(sessionData.sessionId, 'session-update', sessionData);
}

export function broadcastQuizUpdate(quizData) {
  broadcastToRoom(quizData.sessionId, 'quiz-update', quizData);
}

export function broadcastNotification(userId, notificationData) {
  broadcastToUser(userId, 'notification', notificationData);
}

export function broadcastTimetableUpdate(userId, timetableData) {
  broadcastToUser(userId, 'timetable-changed', timetableData);
}

export function broadcastUserJoined(userId, room, userData) {
  broadcastToRoom(room, 'user_joined', { userId, ...userData });
}

export function broadcastUserLeft(userId, room, userData) {
  broadcastToRoom(room, 'user_left', { userId, ...userData });
}

export function broadcastTyping(userId, room, isTyping) {
  broadcastToRoom(room, 'user_typing', { userId, isTyping, room });
}

export function getConnectedClientsCount() {
  return broadcastClients.length;
}

export function getRoomsStats() {
  const rooms = new Map();
  broadcastClients.forEach((client) => {
    if (client.rooms) {
      client.rooms.forEach((_, room) => {
        rooms.set(room, (rooms.get(room) || 0) + 1);
      });
    }
  });
  return Object.fromEntries(rooms);
}
