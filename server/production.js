/**
 * server/production.js
 * Production Express server with SSL and optimized settings
 */

const express = require('express');
const cors = require('cors');
const { connectToDatabase } = require('./db/mongoAtlas');

const app = express();
const PORT = process.env.PORT || 3001;
const isProduction = process.env.NODE_ENV === 'production';

// Security middleware
app.use(cors({
  origin: isProduction ? process.env.ALLOWED_ORIGINS?.split(',') : '*',
  credentials: true,
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

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

app.use('/api/users', usersRouter);
app.use('/api/auth', authRouter);
app.use('/api/classes', classesRouter);
app.use('/api/grades', gradesRouter);
app.use('/api/notes', notesRouter);
app.use('/api/question-bank', questionBankRouter);
app.use('/api/timetable', timetableRouter);
app.use('/api/tickets', ticketsRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/webhooks', webhooksRouter);
app.use('/api/admin', adminRouter);
app.use('/api/integrations', integrationsRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/subjects', subjectsRouter);
app.use('/api/tags-presets', tagPresetsRouter);
app.use('/api', aiRouter);

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
