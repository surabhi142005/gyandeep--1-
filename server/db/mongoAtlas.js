/**
 * server/db/mongoAtlas.js
 * MongoDB Atlas connection optimized for Vercel serverless functions
 * Uses connection pooling and caching for serverless environment
 */

import { MongoClient, ObjectId } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://username:password@cluster.mongodb.net/gyandeep?retryWrites=true&w=majority';
const DB_NAME = process.env.MONGODB_DB || 'gyandeep';

let cachedClient = null;
let cachedDb = null;

export async function connectToDatabase() {
  if (cachedDb) {
    return cachedDb;
  }

  const client = new MongoClient(MONGODB_URI, {
    maxPoolSize: 10,
    minPoolSize: 1,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  });

  await client.connect();
  const db = client.db(DB_NAME);
  
  cachedClient = client;
  cachedDb = db;

  await createIndexes(db);
  
  console.log('Connected to MongoDB Atlas (serverless)');
  return db;
}

async function createIndexes(db) {
  const collections = {
    users: db.collection('users'),
    classes: db.collection('classes'),
    subjects: db.collection('subjects'),
    class_sessions: db.collection('class_sessions'),
    session_notes: db.collection('session_notes'),
    quizzes: db.collection('quizzes'),
    quiz_questions: db.collection('quiz_questions'),
    quiz_attempts: db.collection('quiz_attempts'),
    centralized_notes: db.collection('centralized_notes'),
    user_notes: db.collection('user_notes'),
    events: db.collection('events'),
    attendance: db.collection('attendance'),
    grades: db.collection('grades'),
    timetable_entries: db.collection('timetable_entries'),
    tickets: db.collection('tickets'),
    ticket_replies: db.collection('ticket_replies'),
    teacher_insights: db.collection('teacher_insights'),
    audit_logs: db.collection('audit_logs'),
    idempotency_keys: db.collection('idempotency_keys'),
  };

  await collections.users.createIndex({ email: 1 }, { unique: true });
  await collections.users.createIndex({ role: 1 });
  await collections.users.createIndex({ classId: 1 });
  
  await collections.class_sessions.createIndex({ code: 1 }, { unique: true });
  await collections.class_sessions.createIndex({ teacher_id: 1 });
  await collections.class_sessions.createIndex({ expiry: 1 });
  
  await collections.session_notes.createIndex({ session_id: 1 });
  await collections.quizzes.createIndex({ session_id: 1 });
  await collections.quizzes.createIndex({ teacher_id: 1 });
  await collections.quiz_attempts.createIndex({ quiz_id: 1, student_id: 1 }, { unique: true });
  await collections.quiz_attempts.createIndex({ student_id: 1 });
  await collections.centralized_notes.createIndex({ subjectId: 1, unitNumber: 1 });
  await collections.centralized_notes.createIndex({ classId: 1 });
  await collections.centralized_notes.createIndex({ teacherId: 1 });
  await collections.user_notes.createIndex({ userId: 1 });
  await collections.user_notes.createIndex({ noteId: 1 });
  await collections.attendance.createIndex({ session_id: 1, student_id: 1 }, { unique: true });
  await collections.grades.createIndex({ studentId: 1 });
  await collections.grades.createIndex({ teacherId: 1 });
  await collections.grades.createIndex({ sessionId: 1 });
  await collections.timetable_entries.createIndex({ day: 1, startTime: 1 });
  await collections.timetable_entries.createIndex({ teacherId: 1 });
  await collections.timetable_entries.createIndex({ classId: 1 });
  await collections.tickets.createIndex({ userId: 1 });
  await collections.tickets.createIndex({ status: 1 });
  await collections.ticket_replies.createIndex({ ticketId: 1, createdAt: 1 });
  await collections.audit_logs.createIndex({ userId: 1, ts: 1 });
  await collections.idempotency_keys.createIndex({ createdAt: 1 });

  console.log('MongoDB indexes created');
}

export const COLLECTIONS = {
  USERS: 'users',
  CLASSES: 'classes',
  SUBJECTS: 'subjects',
  CLASS_SESSIONS: 'class_sessions',
  SESSION_NOTES: 'session_notes',
  QUIZZES: 'quizzes',
  QUIZ_QUESTIONS: 'quiz_questions',
  QUIZ_ATTEMPTS: 'quiz_attempts',
  QUIZ_SUBMISSIONS: 'quiz_submissions',
  CENTRALIZED_NOTES: 'centralized_notes',
  USER_NOTES: 'user_notes',
  ATTENDANCE: 'attendance',
  GRADES: 'grades',
  TIMETABLE: 'timetable_entries',
  TICKETS: 'tickets',
  TICKET_REPLIES: 'ticket_replies',
  TEACHER_INSIGHTS: 'teacher_insights',
  AUDIT_LOGS: 'audit_logs',
  IDEMPOTENCY_KEYS: 'idempotency_keys',
};

export function generateId() {
  return new ObjectId().toString();
}

export default { connectToDatabase, COLLECTIONS, generateId };
