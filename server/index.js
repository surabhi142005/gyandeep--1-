/**
 * server/index.js
 * Express server for local development
 */

import 'dotenv/config';
import path from 'path';
import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { connectToDatabase } from './db/mongoAtlas.js';
import { standardRateLimiter, authRateLimiter, strictRateLimiter } from './middleware/rateLimiter.js';
import { securityHeaders, sanitizeInput, requestSizeLimit, csrfProtection } from './middleware/security.js';
import { setupWebSocket } from './websocket.js';
import { initRedis, isRedisConnected, healthCheck as redisHealthCheck } from './services/cache.js';
import { errorHandler } from './middleware/errorHandler.js';

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
import emailRouter from './routes/email.js';
import teacherStatsRouter from './routes/teacherStats.js';

const app = express();
const PORT = process.env.PORT || 3001;
const BODY_SIZE_LIMIT = process.env.BODY_SIZE_LIMIT || '10mb';

// Security headers for all routes
app.use(securityHeaders);

// Cookie parser for httpOnly cookies
app.use(cookieParser());

// CORS configuration - support both ALLOWED_ORIGINS, ALLOWED_ORIGIN, FRONTEND_URL and VERCEL_URL
const getCorsOrigins = () => {
  const origins = [];
  
  if (process.env.FRONTEND_URL) {
    origins.push(process.env.FRONTEND_URL);
  }

  if (process.env.ALLOWED_ORIGIN) {
    origins.push(process.env.ALLOWED_ORIGIN);
  }
  
  if (process.env.ALLOWED_ORIGINS) {
    if (process.env.ALLOWED_ORIGINS === '*') return '*';
    origins.push(...process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim()).filter(Boolean));
  }

  // Vercel deployment URLs
  if (process.env.VERCEL_URL) origins.push(`https://${process.env.VERCEL_URL}`);
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) origins.push(`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`);
  if (process.env.VERCEL_BRANCH_URL) origins.push(`https://${process.env.VERCEL_BRANCH_URL}`);
  
  // Return unique, normalized origins or *
  return origins.length > 0 
    ? [...new Set(origins.map(o => o.replace(/\/$/, '').toLowerCase()))] 
    : '*';
};

const allowedOrigins = getCorsOrigins();

// CORS preflight handler - must be before cors() middleware
app.options('*', cors());

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const normalizedOrigin = origin.replace(/\/$/, '').toLowerCase();
    
    // Check if origin is allowed
    const isAllowed = allowedOrigins === '*' || 
                     allowedOrigins.includes(normalizedOrigin) ||
                     normalizedOrigin.endsWith('.vercel.app') ||
                     (process.env.VERCEL && normalizedOrigin.includes('vercel.app'));

    if (isAllowed) {
      callback(null, true);
    } else {
      console.warn(`[CORS] Origin ${origin} not allowed. Allowed: ${JSON.stringify(allowedOrigins)}`);
      callback(null, false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'X-CSRF-Signature', 'X-Session-Secret'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
}));

// Body parsing with size limit
app.use(express.json({ limit: BODY_SIZE_LIMIT }));
app.use(express.urlencoded({ extended: true, limit: BODY_SIZE_LIMIT }));

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

// Auth routes with stricter rate limiting - NO CSRF on public auth endpoints
// CSRF is for authenticated users only; login/register are public
app.use('/api/auth', authRateLimiter.middleware(), authRouter);

// User routes with CSRF protection for mutating operations
app.use('/api/users', csrfProtection, usersRouter);

// Classes routes with CSRF protection
app.use('/api/classes', csrfProtection, classesRouter);

// Grades routes with CSRF protection
app.use('/api/grades', csrfProtection, gradesRouter);

// Attendance routes with CSRF protection
app.use('/api/attendance', csrfProtection, attendanceRouter);

// Notes routes with CSRF protection
app.use('/api/notes', csrfProtection, notesRouter);

// Question bank routes with CSRF protection
app.use('/api/question-bank', csrfProtection, questionBankRouter);

// Timetable routes with CSRF protection
app.use('/api/timetable', csrfProtection, timetableRouter);

// Tickets routes with CSRF protection
app.use('/api/tickets', csrfProtection, ticketsRouter);

// Notifications routes with CSRF protection
app.use('/api/notifications', csrfProtection, notificationsRouter);

// Webhooks routes with CSRF protection
app.use('/api/webhooks', csrfProtection, webhooksRouter);

// Admin routes with CSRF protection
app.use('/api/admin', csrfProtection, adminRouter);

// Integrations routes with CSRF protection
app.use('/api/integrations', csrfProtection, integrationsRouter);

// Analytics routes (read-only, no CSRF needed)
app.use('/api/analytics', analyticsRouter);

// Subjects routes with CSRF protection
app.use('/api/subjects', csrfProtection, subjectsRouter);

// Tags presets routes with CSRF protection
app.use('/api/tags-presets', csrfProtection, tagPresetsRouter);

// Storage routes (file uploads) with CSRF protection
app.use('/api/storage', csrfProtection, storageRouter);

// SSE events routes (real-time updates)
app.use('/api/events', eventsRouter);

// Announcements routes with CSRF protection
app.use('/api/announcements', csrfProtection, announcementsRouter);

// Sessions routes (quiz, attendance) with CSRF protection
app.use('/api/sessions', csrfProtection, sessionsRouter);

// Face routes (registration/verification) with CSRF protection
app.use('/api/face', csrfProtection, faceRouter);

// Google OAuth routes with CSRF protection
app.use('/api/google', csrfProtection, googleRouter);

// AI routes with CSRF protection
app.use('/api', csrfProtection, aiRouter);

// Email notifications with CSRF protection
app.use('/api', csrfProtection, emailRouter);

// Metrics endpoint (Prometheus)
app.use('/metrics', metricsRouter);

// Audit logs routes with CSRF protection
app.use('/api/admin/audit-logs', csrfProtection, auditLogsRouter);

// Teacher stats routes with CSRF protection
app.use('/api/teacher', csrfProtection, teacherStatsRouter);

// Create HTTP server and attach WebSocket (only if not on Vercel)
const server = createServer(app);
if (!process.env.VERCEL) {
  setupWebSocket(server);
}

import { initSentry, setupSentryErrorHandlers } from './services/sentry.js';

// Initialize Redis (optional - will gracefully degrade if not available)
initRedis();

// Initialize Sentry error tracking (optional)
initSentry();
setupSentryErrorHandlers(app);

// Global error handler
app.use(errorHandler);

// Serve static files from dist folder in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(process.cwd(), 'dist'), {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.webmanifest')) {
        res.setHeader('Content-Type', 'application/manifest+json');
      }
    }
  }));

  // SPA fallback - serve index.html for non-API routes
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api/') && !req.path.startsWith('/auth/') && !req.path.startsWith('/storage/')) {
      res.sendFile(path.join(process.cwd(), 'dist', 'index.html'));
    } else {
      res.status(404).json({ error: 'Not found' });
    }
  });
} else {
  // 404 handler for development
  app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
  });
}

// Start server only if not running on Vercel
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  server.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
    console.log(`🔌 WebSocket: ws://localhost:${PORT}/ws`);
  });
}

export default app;
export { server };
