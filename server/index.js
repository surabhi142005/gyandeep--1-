/**
 * server/index.js
 * Express server for local development
 */

import './utils/env.js';
import path from 'path';
import fs from 'fs';
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
import seedRouter from './routes/seed.js';

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
  
  // Always allow FRONTEND_URL if provided
  if (process.env.FRONTEND_URL) {
    origins.push(process.env.FRONTEND_URL);
  }

  if (process.env.ALLOWED_ORIGIN) {
    origins.push(process.env.ALLOWED_ORIGIN);
  }
  
  // Parse ALLOWED_ORIGINS - never use '*' in production with credentials
  if (process.env.ALLOWED_ORIGINS) {
    const trimmed = process.env.ALLOWED_ORIGINS.trim().toLowerCase();
    // Block wildcard in production - it's insecure with credentials mode
    if (trimmed === '*' && process.env.NODE_ENV === 'production') {
      console.warn('[CORS] WARNING: ALLOWED_ORIGINS=* is insecure with credentials mode');
    } else if (trimmed !== '*') {
      origins.push(...trimmed.split(',').map(o => o.trim()).filter(Boolean));
    }
  }

  // Vercel deployment URLs (automatically provided by Vercel)
  if (process.env.VERCEL_URL) origins.push(`https://${process.env.VERCEL_URL}`);
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) origins.push(`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`);
  if (process.env.VERCEL_BRANCH_URL) origins.push(`https://${process.env.VERCEL_BRANCH_URL}`);
  
  // In production, if no origins configured, we can't allow all (insecure with credentials)
  // Instead, require explicit configuration
  if (origins.length === 0 && process.env.NODE_ENV === 'production') {
    console.error('[CORS] No ALLOWED_ORIGINS configured for production! API requests will fail.');
  }
  
  const filtered = origins.map(o => o.replace(/\/$/, '').toLowerCase()).filter(o => o !== '*');
  return filtered.length > 0 
    ? [...new Set(filtered)] 
    : ['http://localhost:5173', 'http://localhost:10000']; // Development fallback
};

const allowedOrigins = getCorsOrigins();

console.log('[CORS] Allowed origins:', JSON.stringify(allowedOrigins));

// CORS preflight handler - must be before cors() middleware
app.options('*', cors());

// Permissive CORS for all deployments - allow all common platforms
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin ( curl, mobile apps)
    if (!origin) return callback(null, true);
    
    // Allow localhost
    if (origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')) {
      return callback(null, true);
    }
    
    // Allow all deployment platforms
    const allowedPlatforms = [
      '.vercel.app',
      '.vercel.sh', 
      '.onrender.com',
      '.railway.app',
      '.herokuapp.com',
      '.cloudflareapps.com',
      '.azurewebsites.net'
    ];
    
    const isAllowed = allowedPlatforms.some(p => origin.includes(p));
    
    if (isAllowed) {
      return callback(null, true);
    }
    
    // In development, allow everything
    if (process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    
    // In production, block unknown origins but log
    console.warn(`[CORS] Blocking unknown origin: ${origin}`);
    callback(null, false);
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

// Auth routes - NO rate limit, NO CSRF, completely public for login/register
app.use('/api/auth', authRouter);

// User routes with CSRF protection for mutating operations
app.use('/api/users', usersRouter);

// Classes routes - no CSRF
app.use('/api/classes', classesRouter);

// Grades routes - no CSRF
app.use('/api/grades', gradesRouter);

// Attendance routes - no CSRF
app.use('/api/attendance', attendanceRouter);

// Notes routes - no CSRF
app.use('/api/notes', notesRouter);

// Question bank routes - no CSRF
app.use('/api/question-bank', questionBankRouter);

// Timetable routes - no CSRF
app.use('/api/timetable', timetableRouter);

// Tickets routes - no CSRF
app.use('/api/tickets', ticketsRouter);

// Notifications routes - no CSRF
app.use('/api/notifications', notificationsRouter);

// Webhooks routes - no CSRF
app.use('/api/webhooks', webhooksRouter);

// Admin routes - no CSRF
app.use('/api/admin', adminRouter);

// Integrations routes - no CSRF
app.use('/api/integrations', integrationsRouter);

// Analytics routes - no CSRF
app.use('/api/analytics', analyticsRouter);

// Subjects routes - no CSRF
app.use('/api/subjects', subjectsRouter);

// Tags presets routes - no CSRF
app.use('/api/tags-presets', tagPresetsRouter);

// Storage routes (file uploads) - no CSRF
app.use('/api/storage', storageRouter);

// SSE events routes (real-time updates)
app.use('/api/events', eventsRouter);

// Announcements routes - no CSRF
app.use('/api/announcements', announcementsRouter);

// Sessions routes (quiz, attendance) - no CSRF
app.use('/api/sessions', sessionsRouter);

// Face routes (registration/verification) - no CSRF
app.use('/api/face', faceRouter);

// Google OAuth routes - no CSRF
app.use('/api/google', googleRouter);

// AI routes - no CSRF
app.use('/api', aiRouter);

// Email notifications - no CSRF
app.use('/api', emailRouter);

// Metrics endpoint (Prometheus)
app.use('/metrics', metricsRouter);

// Audit logs routes - no CSRF
app.use('/api/admin/audit-logs', auditLogsRouter);

// Teacher stats routes - no CSRF
app.use('/api/teacher', teacherStatsRouter);
app.use('/api/seed', seedRouter);

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

// Find dist folder - check multiple locations for Vercel compatibility
const getDistPath = () => {
  const candidates = [
    path.join(process.cwd(), 'dist'),
    path.join(process.cwd(), '..', 'app', 'dist'),
    path.join('/app', 'dist'),
  ];
  for (const distPath of candidates) {
    try {
      if (require('fs').existsSync(distPath)) return distPath;
    } catch { /* ignore */ }
  }
  return path.join(process.cwd(), 'dist');
};

const distPath = getDistPath();
const hasFrontend = fs.existsSync(path.join(distPath, 'index.html'));

// Serve static files from dist folder in production (if built)
if (process.env.NODE_ENV === 'production' && hasFrontend) {
  app.use(express.static(distPath, {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.webmanifest')) {
        res.setHeader('Content-Type', 'application/manifest+json');
      }
    }
  }));

  // SPA fallback - serve index.html for non-API routes
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api/') && !req.path.startsWith('/auth/') && !req.path.startsWith('/storage/')) {
      res.sendFile(path.join(distPath, 'index.html'));
    } else {
      res.status(404).json({ error: 'Not found' });
    }
  });
} else if (process.env.NODE_ENV === 'production') {
  // No frontend built - API-only mode
  console.log('[Server] Running in API-only mode (no frontend)');
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) {
      res.status(404).json({ error: 'API endpoint not found' });
    } else {
      res.status(200).json({ message: 'GyanDeep API is running. Frontend should be deployed separately.' });
    }
  });
} else {
  // 404 handler for development
  app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
  });
}

// Start server only if not running on Vercel
if (!process.env.VERCEL) {
  server.listen(PORT, () => {
    const isProd = process.env.NODE_ENV === 'production';
    const host = process.env.API_URL || (isProd ? `https://${process.env.RENDER_EXTERNAL_URL?.split(':')[0] || 'api.gyandeep.edu'}` : `http://localhost:${PORT}`);
    const wsHost = process.env.WS_URL || (isProd ? `wss://${process.env.RENDER_EXTERNAL_URL?.split(':')[0] || 'api.gyandeep.edu'}` : `ws://localhost:${PORT}`);
    
    console.log(`🚀 Server running on ${host}`);
    console.log(`📊 Health check: ${host}/api/health`);
    console.log(`🔌 WebSocket: ${wsHost}/ws`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

export default app;
export { server };
