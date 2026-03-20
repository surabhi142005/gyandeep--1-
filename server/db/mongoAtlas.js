/**
 * server/db/mongoAtlas.js
 * MongoDB connection for Express server
 */

import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/gyandeep';
const MONGODB_DB = process.env.MONGODB_DB || 'gyandeep';

let cachedClient = null;
let cachedDb = null;

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
};

export async function connectToDatabase() {
  if (cachedDb) {
    return cachedDb;
  }

  if (!cachedClient) {
    cachedClient = new MongoClient(MONGODB_URI);
    await cachedClient.connect();
  }

  const db = cachedClient.db(MONGODB_DB);
  cachedDb = db;
  return db;
}
