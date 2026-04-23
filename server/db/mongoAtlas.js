/**
 * server/db/mongoAtlas.js
 * MongoDB connection with production-ready configuration
 */

import { MongoClient } from 'mongodb';

const isProduction = process.env.NODE_ENV === 'production';
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
  FACE_EMBEDDINGS: 'face_embeddings',
  AUDIT_FACE_VERIFY: 'audit_face_verify',
};

export async function connectToDatabase() {
  if (cachedDb) {
    return cachedDb;
  }

  const dbName = process.env.MONGODB_DB || 'gyandeep';
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.error('[MongoDB] Connection failed: MONGODB_URI is not defined in environment variables');
    console.error('[MongoDB] NODE_ENV:', process.env.NODE_ENV);
    throw new Error('MONGODB_URI environment variable is required for database connection');
  }

  if (!cachedClient) {
    connectionStartTime = Date.now();
    
    const clientOptions = {
      ...POOL_CONFIG,
    };

    console.log(`[MongoDB] Attempting to connect to: ${uri.split('@')[1] ? 'MongoDB Atlas' : 'Local MongoDB'}`);
    cachedClient = new MongoClient(uri, clientOptions);
    
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
    
    if (ENVIRONMENT !== 'test') {
      await createIndexes();
    }
  }

  const db = cachedClient.db(dbName);
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

async function tryCreateIndex(collection, index, options = {}) {
  try {
    await collection.createIndex(index, options);
  } catch (e) {
    if (!e.message.includes('Index already exists')) {
      console.warn(`[MongoDB] Index warning: ${e.message}`);
    }
  }
}

export async function createIndexes() {
  const db = await connectToDatabase();
  
  try {
    await tryCreateIndex(db.collection(COLLECTIONS.USERS), { email: 1 }, { unique: true });
    await tryCreateIndex(db.collection(COLLECTIONS.USERS), { role: 1 });
    await tryCreateIndex(db.collection(COLLECTIONS.USERS), { classId: 1 });
    await tryCreateIndex(db.collection(COLLECTIONS.USERS), { createdAt: -1 });
    
    await tryCreateIndex(db.collection(COLLECTIONS.ATTENDANCE), { studentId: 1, timestamp: -1 });
    await tryCreateIndex(db.collection(COLLECTIONS.ATTENDANCE), { classId: 1, timestamp: -1 });
    await tryCreateIndex(db.collection(COLLECTIONS.ATTENDANCE), { sessionId: 1 });
    
    await tryCreateIndex(db.collection(COLLECTIONS.GRADES), { studentId: 1, subjectId: 1 });
    await tryCreateIndex(db.collection(COLLECTIONS.GRADES), { studentId: 1, gradedAt: -1 });
    await tryCreateIndex(db.collection(COLLECTIONS.GRADES), { subjectId: 1 });
    
    await tryCreateIndex(db.collection(COLLECTIONS.FACE_EMBEDDINGS), { userId: 1 }, { unique: true });
    
    await tryCreateIndex(db.collection(COLLECTIONS.PASSWORD_RESETS), { email: 1, code: 1 });
    await tryCreateIndex(db.collection(COLLECTIONS.PASSWORD_RESETS), { expiresAt: 1 }, { expireAfterSeconds: 0 });
    
    await tryCreateIndex(db.collection(COLLECTIONS.EMAIL_VERIFICATIONS), { email: 1 });
    await tryCreateIndex(db.collection(COLLECTIONS.EMAIL_VERIFICATIONS), { expiresAt: 1 }, { expireAfterSeconds: 0 });
    
    await tryCreateIndex(db.collection(COLLECTIONS.TICKETS), { status: 1, createdAt: -1 });
    await tryCreateIndex(db.collection(COLLECTIONS.TICKETS), { assignedToId: 1 });
    
    await tryCreateIndex(db.collection(COLLECTIONS.TICKET_REPLIES), { ticketId: 1, createdAt: 1 });
    
    await tryCreateIndex(db.collection(COLLECTIONS.CLASS_SESSIONS), { classId: 1, startTime: 1 });
    
    await tryCreateIndex(db.collection(COLLECTIONS.TIMETABLE), { classId: 1, dayOfWeek: 1 });
    
    await tryCreateIndex(db.collection(COLLECTIONS.NOTIFICATIONS), { userId: 1, read: 1 });
    await tryCreateIndex(db.collection(COLLECTIONS.NOTIFICATIONS), { createdAt: -1 });
    
    await tryCreateIndex(db.collection(COLLECTIONS.ACTIVITY_LOGS), { userId: 1, createdAt: -1 });
    
    await tryCreateIndex(db.collection(COLLECTIONS.AUDIT_LOGS), { userId: 1, createdAt: -1 });
    await tryCreateIndex(db.collection(COLLECTIONS.AUDIT_LOGS), { action: 1, createdAt: -1 });
    
    await tryCreateIndex(db.collection(COLLECTIONS.AUDIT_FACE_VERIFY), { userId: 1, timestamp: -1 });
    
    console.log('[MongoDB] Indexes ready');
  } catch (error) {
    console.error('[MongoDB] Index error:', error.message);
  }
}
