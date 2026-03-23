/**
 * server/index.js
 * Express server for local development
 */

import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { connectToDatabase } from './db/mongoAtlas.js';
import { standardRateLimiter, authRateLimiter, strictRateLimiter } from './middleware/rateLimiter.js';
import { securityHeaders, sanitizeInput, requestSizeLimit } from './middleware/security.js';
import { setupWebSocket } from './websocket.js';
import { initRedis, isRedisConnected, healthCheck as redisHealthCheck } from './services/cache.js';
import { initSentry, setupSentryErrorHandlers, captureException, addBreadcrumb } from './services/sentry.js';

import authRouter from './routes/auth.js';
import usersRouter from './routes/users.js';
import classesRouter from './routes/classes.js';
import gradesRouter from './routes/grades.js';
import attendanceRouter from './routes/attendance.js';
import notesRouter from './routes/notes.js';
import questionBankRouter from './routes/questionBank.js';
import timetableRouter from './routes/timetable.js';
import ticketsRouter from './routes/tickets.js';
import notificationsRouter from './routes/notifications.js';
import webhooksRouter from './routes/webhooks.js';
import adminRouter from './routes/admin.js';
import integrationsRouter from './routes/integrations.js';
import analyticsRouter from './routes/analytics.js';
import subjectsRouter from './routes/subjects.js';
import tagPresetsRouter from './routes/tagPresets.js';
import storageRouter from './routes/storage.js';
import eventsRouter from './routes/events.js';
import googleRouter from './routes/google.js';
import aiRouter from './routes/ai.js';
import metricsRouter from './routes/metrics.js';
import auditLogsRouter from './routes/auditLogs.js';
import announcementsRouter from './routes/announcements.js';
import sessionsRouter from './routes/sessions.js';
import faceRouter from './routes/face.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Security headers for all routes
app.use(securityHeaders);

// Cookie parser for httpOnly cookies
app.use(cookieParser());

// CORS configuration
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'X-Session-Secret'],
}));

// Body parsing with size limit
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request size validation
app.use(requestSizeLimit);

// Input sanitization
app.use(sanitizeInput);

// Standard rate limiting for all API routes
app.use('/api', standardRateLimiter.middleware());

// Health check (no rate limiting)
app.get('/api/health', async (req, res) => {
  try {
    const db = await connectToDatabase();
    await db.collection('users').findOne({});
    
    const redisStatus = redisHealthCheck();
    
    res.json({ 
      status: 'ok', 
      db: 'connected', 
      redis: redisStatus.status === 'healthy' ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString() 
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(503).json({ status: 'error', db: 'disconnected', error: error.message });
  }
});

// Auth routes with stricter rate limiting
app.use('/api/auth', authRateLimiter.middleware(), authRouter);

// User routes
app.use('/api/users', usersRouter);

// Classes routes
app.use('/api/classes', classesRouter);

// Grades routes
app.use('/api/grades', gradesRouter);

// Attendance routes
app.use('/api/attendance', attendanceRouter);

// Notes routes
app.use('/api/notes', notesRouter);

// Question bank routes
app.use('/api/question-bank', questionBankRouter);

// Timetable routes
app.use('/api/timetable', timetableRouter);

// Tickets routes
app.use('/api/tickets', ticketsRouter);

// Notifications routes
app.use('/api/notifications', notificationsRouter);

// Webhooks routes
app.use('/api/webhooks', webhooksRouter);

// Admin routes
app.use('/api/admin', adminRouter);

// Integrations routes
app.use('/api/integrations', integrationsRouter);

// Analytics routes
app.use('/api/analytics', analyticsRouter);

// Subjects routes
app.use('/api/subjects', subjectsRouter);

// Tags presets routes
app.use('/api/tags-presets', tagPresetsRouter);

// Storage routes (file uploads)
app.use('/api/storage', storageRouter);

// SSE events routes (real-time updates)
app.use('/api/events', eventsRouter);

// Announcements routes
app.use('/api/announcements', announcementsRouter);

// Sessions routes (quiz, attendance)
app.use('/api/sessions', sessionsRouter);

// Face routes (registration/verification)
app.use('/api/face', faceRouter);

// Google OAuth routes
app.use('/api/google', googleRouter);

// AI routes
app.use('/api', aiRouter);

// Metrics endpoint (Prometheus)
app.use('/metrics', metricsRouter);

// Audit logs routes
app.use('/api/admin/audit-logs', auditLogsRouter);

// Create HTTP server and attach WebSocket
const server = createServer(app);
setupWebSocket(server);

// Initialize Redis (optional - will gracefully degrade if not available)
initRedis();

// Initialize Sentry error tracking (optional)
initSentry();
setupSentryErrorHandlers(app);

// Start server
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔌 WebSocket: ws://localhost:${PORT}/ws`);
});

export default app;
export { server };
