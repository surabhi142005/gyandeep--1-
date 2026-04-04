/**
 * server/production.js
 * Production Express server with SSL and optimized settings
 */

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { connectToDatabase } = require('./db/mongoAtlas');
const { standardRateLimiter, authRateLimiter } = require('./middleware/rateLimiter');
const { securityHeaders, csrfProtection } = require('./middleware/security');

const app = express();
const PORT = process.env.PORT || 3001;
const isProduction = process.env.NODE_ENV === 'production';
const BODY_SIZE_LIMIT = process.env.BODY_SIZE_LIMIT || '10mb';

// Security headers
app.use(securityHeaders);

// Cookie parser
app.use(cookieParser());

// CORS configuration
app.use(cors({
  origin: isProduction ? process.env.ALLOWED_ORIGINS?.split(',') : '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'X-Session-Secret'],
}));

// Rate limiting
app.use('/api', standardRateLimiter.middleware());

app.use(express.json({ limit: BODY_SIZE_LIMIT }));
app.use(express.urlencoded({ extended: true, limit: BODY_SIZE_LIMIT }));

// Request logging in production
if (isProduction) {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
    next();
  });
}

// Health check
app.get('/api/health', async (req, res) => {
  try {
    const db = await connectToDatabase();
    await db.collection('users').findOne({});
    res.json({ 
      status: 'ok', 
      db: 'connected', 
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(503).json({ 
      status: 'error', 
      db: 'disconnected', 
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// All routes from index.js
const usersRouter = require('./routes/users');
const authRouter = require('./routes/auth');
const classesRouter = require('./routes/classes');
const gradesRouter = require('./routes/grades');
const notesRouter = require('./routes/notes');
const questionBankRouter = require('./routes/questionBank');
const timetableRouter = require('./routes/timetable');
const ticketsRouter = require('./routes/tickets');
const notificationsRouter = require('./routes/notifications');
const webhooksRouter = require('./routes/webhooks');
const adminRouter = require('./routes/admin');
const integrationsRouter = require('./routes/integrations');
const analyticsRouter = require('./routes/analytics');
const subjectsRouter = require('./routes/subjects');
const tagPresetsRouter = require('./routes/tagPresets');
const aiRouter = require('./routes/ai');
const teacherStatsRouter = require('./routes/teacherStats');
const attendanceRouter = require('./routes/attendance');
const faceRouter = require('./routes/face');
const googleRouter = require('./routes/google');
const storageRouter = require('./routes/storage');
const eventsRouter = require('./routes/events');
const sessionsRouter = require('./routes/sessions');
const announcementsRouter = require('./routes/announcements');
const auditLogsRouter = require('./routes/auditLogs');
const emailRouter = require('./routes/email');

app.use('/api/users', csrfProtection, usersRouter);
app.use('/api/auth', authRateLimiter.middleware(), csrfProtection, authRouter);
app.use('/api/classes', csrfProtection, classesRouter);
app.use('/api/grades', csrfProtection, gradesRouter);
app.use('/api/attendance', csrfProtection, attendanceRouter);
app.use('/api/notes', csrfProtection, notesRouter);
app.use('/api/question-bank', csrfProtection, questionBankRouter);
app.use('/api/timetable', csrfProtection, timetableRouter);
app.use('/api/tickets', csrfProtection, ticketsRouter);
app.use('/api/notifications', csrfProtection, notificationsRouter);
app.use('/api/webhooks', csrfProtection, webhooksRouter);
app.use('/api/admin', csrfProtection, adminRouter);
app.use('/api/integrations', csrfProtection, integrationsRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/subjects', csrfProtection, subjectsRouter);
app.use('/api/tags-presets', csrfProtection, tagPresetsRouter);
app.use('/api/storage', csrfProtection, storageRouter);
app.use('/api/events', eventsRouter);
app.use('/api/announcements', csrfProtection, announcementsRouter);
app.use('/api/sessions', csrfProtection, sessionsRouter);
app.use('/api/face', csrfProtection, faceRouter);
app.use('/api/google', csrfProtection, googleRouter);
app.use('/api/teacher', csrfProtection, teacherStatsRouter);
app.use('/api', csrfProtection, aiRouter);
app.use('/api', csrfProtection, emailRouter);
app.use('/api/admin/audit-logs', csrfProtection, auditLogsRouter);

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Production server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
});

module.exports = app;
