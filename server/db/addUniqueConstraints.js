/**
 * server/db/addUniqueConstraints.js
 * Adds database constraints to prevent duplicate entries
 */

import { connectToDatabase, COLLECTIONS } from './mongoAtlas.js';
import { ObjectId } from 'mongodb';

export async function addDatabaseConstraints() {
  const db = await connectToDatabase();

  try {
    // Unique index on attendance (sessionId + studentId) to prevent duplicates
    await db.collection(COLLECTIONS.ATTENDANCE).createIndex(
      { sessionId: 1, studentId: 1 },
      { unique: true, name: 'unique_attendance_per_session' }
    );

    // Unique index on quiz attempts (sessionId + studentId) to prevent duplicates
    await db.collection(COLLECTIONS.QUIZ_ATTEMPTS).createIndex(
      { sessionId: 1, studentId: 1 },
      { unique: true, name: 'unique_quiz_attempt_per_session' }
    );

    // Unique index on session codes
    await db.collection(COLLECTIONS.CLASS_SESSIONS).createIndex(
      { code: 1 },
      { unique: true, sparse: true, name: 'unique_session_code' }
    );

    // Index for faster attendance queries
    await db.collection(COLLECTIONS.ATTENDANCE).createIndex(
      { sessionId: 1, timestamp: -1 },
      { name: 'attendance_session_time_idx' }
    );

    // Index for faster user XP queries
    await db.collection(COLLECTIONS.USERS).createIndex(
      { xp: -1 },
      { name: 'user_xp_leaderboard_idx' }
    );

    console.log('[DB] Database constraints added successfully');
  } catch (error) {
    console.error('[DB] Failed to add constraints:', error);
    throw error;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  addDatabaseConstraints()
    .then(() => {
      console.log('Constraints setup complete');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Failed:', err);
      process.exit(1);
    });
}
