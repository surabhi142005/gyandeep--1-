/**
 * server/db/mongoAtlas.js
 * MongoDB connection with production-ready configuration
 */

import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/gyandeep';
const MONGODB_DB = process.env.MONGODB_DB || 'gyandeep';

const ENVIRONMENT = process.env.NODE_ENV || 'development';

const POOL_CONFIG = {
  minPoolSize: ENVIRONMENT === 'production' ? 5 : 1,
  maxPoolSize: ENVIRONMENT === 'production' ? 50 : 10,
  maxIdleTimeMS: 30000,
  waitQueueTimeoutMS: 25000,
  connectTimeoutMS: 10000,
  socketTimeoutMS: 45000,
  serverSelectionTimeoutMS: 30000,
  family: 4,
};

let cachedClient = null;
let cachedDb = null;
let connectionStartTime = null;

export const COLLECTIONS = {
  USERS: 'users',
  CLASSES: 'classes',
  SUBJECTS: 'subjects',
  CLASS_SESSIONS: 'class_sessions',
  SESSION_NOTES: 'session_notes',
  CENTRALIZED_NOTES: 'centralized_notes',
  QUIZZES: 'quizzes',
  QUIZ_QUESTIONS: 'quiz_questions',
  QUIZ_ATTEMPTS: 'quiz_attempts',
  ATTEMPT_ANSWERS: 'attempt_answers',
  ATTENDANCE: 'attendance',
  GRADES: 'grades',
  TICKETS: 'tickets',
  TICKET_REPLIES: 'ticket_replies',
  NOTIFICATIONS: 'notifications',
  ANNOUNCEMENTS: 'announcements',
  TIMETABLE: 'timetable',
  CLASS_SUBJECTS: 'class_subjects',
  USER_SUBJECTS: 'user_subjects',
  ACTIVITY_LOGS: 'activity_logs',
  EMAIL_VERIFICATIONS: 'email_verifications',
  PASSWORD_RESETS: 'password_resets',
  WEBHOOKS: 'webhooks',
  TAG_PRESETS: 'tag_presets',
  QUESTION_BANK: 'question_bank',
  AUDIT_LOGS: 'audit_logs',
};

export async function connectToDatabase() {
  if (cachedDb) {
    return cachedDb;
  }

  if (!cachedClient) {
    connectionStartTime = Date.now();
    
    const clientOptions = {
      ...POOL_CONFIG,
      loggerLevel: ENVIRONMENT === 'development' ? 'debug' : 'error',
    };

    cachedClient = new MongoClient(MONGODB_URI, clientOptions);
    
    cachedClient.on('serverHeartbeatStarted', () => {
      if (ENVIRONMENT === 'development') {
        console.log('[MongoDB] Heartbeat started');
      }
    });

    cachedClient.on('serverHeartbeatSucceeded', (event) => {
      if (ENVIRONMENT === 'development') {
        console.log(`[MongoDB] Heartbeat succeeded: ${event.duration}ms`);
      }
    });

    cachedClient.on('serverHeartbeatFailed', (event) => {
      console.error('[MongoDB] Heartbeat failed:', event.failure);
    });

    cachedClient.on('connectionPoolCreated', (event) => {
      console.log(`[MongoDB] Connection pool created with size: ${event.options.maxPoolSize}`);
    });

    cachedClient.on('connectionPoolClosed', () => {
      console.log('[MongoDB] Connection pool closed');
    });

    cachedClient.on('connectionCreated', (event) => {
      if (ENVIRONMENT === 'development') {
        console.log(`[MongoDB] Connection created: ${event.connectionId}`);
      }
    });

    cachedClient.on('connectionClosed', (event) => {
      if (ENVIRONMENT === 'development') {
        console.log(`[MongoDB] Connection closed: ${event.connectionId}, reason: ${event.reason}`);
      }
    });

    cachedClient.on('error', (event) => {
      console.error('[MongoDB] Error:', event);
    });

    await cachedClient.connect();
    
    const connectTime = Date.now() - connectionStartTime;
    console.log(`[MongoDB] Connected successfully in ${connectTime}ms`);
  }

  const db = cachedClient.db(MONGODB_DB);
  cachedDb = db;
  return db;
}

export async function closeDatabase() {
  if (cachedClient) {
    await cachedClient.close();
    cachedClient = null;
    cachedDb = null;
    console.log('[MongoDB] Connection closed');
  }
}

export function getDatabaseStats() {
  return {
    isConnected: !!cachedClient,
    isCached: !!cachedDb,
    poolConfig: POOL_CONFIG,
  };
}

export async function healthCheck() {
  try {
    const db = await connectToDatabase();
    const startTime = Date.now();
    await db.command({ ping: 1 });
    const latency = Date.now() - startTime;
    
    return {
      status: 'healthy',
      latency,
      poolStats: cachedClient?.topology?.sessionPool?.stats?.(),
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
    };
  }
}
