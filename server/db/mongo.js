/**
 * server/db/mongo.js
 * MongoDB connection and operations for Gyandeep
 * 
 * Replaces SQLite with MongoDB Atlas for cloud deployment
 */

import { MongoClient, ObjectId } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://username:password@cluster.mongodb.net/gyandeep?retryWrites=true&w=majority';
const DB_NAME = process.env.MONGODB_DB || 'gyandeep';

let client = null;
let db = null;

export const connectDB = async () => {
    if (db) return db;
    
    try {
        client = new MongoClient(MONGODB_URI);
        await client.connect();
        db = client.db(DB_NAME);
        
        // Create indexes
        await createIndexes();
        
        console.log('Connected to MongoDB Atlas');
        return db;
    } catch (error) {
        console.error('MongoDB connection error:', error);
        throw error;
    }
};

export const getDB = () => {
    if (!db) throw new Error('Database not connected');
    return db;
};

export const getClient = () => {
    if (!client) throw new Error('MongoDB client not connected');
    return client;
};

// Helper to generate UUID-like ID
export const generateId = () => new ObjectId().toString();

// Collection names
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

// Create indexes for better performance
const createIndexes = async () => {
    const db = getDB();
    
    // Users indexes
    await db.collection(COLLECTIONS.USERS).createIndex({ email: 1 }, { unique: true });
    await db.collection(COLLECTIONS.USERS).createIndex({ role: 1 });
    await db.collection(COLLECTIONS.USERS).createIndex({ classId: 1 });
    
    // Sessions indexes
    await db.collection(COLLECTIONS.CLASS_SESSIONS).createIndex({ code: 1 }, { unique: true });
    await db.collection(COLLECTIONS.CLASS_SESSIONS).createIndex({ teacher_id: 1 });
    await db.collection(COLLECTIONS.CLASS_SESSIONS).createIndex({ expiry: 1 });
    
    // Session notes indexes
    await db.collection(COLLECTIONS.SESSION_NOTES).createIndex({ session_id: 1 });
    
    // Quizzes indexes
    await db.collection(COLLECTIONS.QUIZZES).createIndex({ session_id: 1 });
    await db.collection(COLLECTIONS.QUIZZES).createIndex({ teacher_id: 1 });
    
    // Quiz attempts indexes
    await db.collection(COLLECTIONS.QUIZ_ATTEMPTS).createIndex({ quiz_id: 1, student_id: 1 }, { unique: true });
    await db.collection(COLLECTIONS.QUIZ_ATTEMPTS).createIndex({ student_id: 1 });
    
    // Quiz submissions (legacy) indexes
    await db.collection(COLLECTIONS.QUIZ_SUBMISSIONS).createIndex({ session_id: 1, student_id: 1 }, { unique: true });
    
    // Centralized notes indexes
    await db.collection(COLLECTIONS.CENTRALIZED_NOTES).createIndex({ subjectId: 1, unitNumber: 1 });
    await db.collection(COLLECTIONS.CENTRALIZED_NOTES).createIndex({ classId: 1 });
    await db.collection(COLLECTIONS.CENTRALIZED_NOTES).createIndex({ teacherId: 1 });
    
    // User notes access tracking
    await db.collection(COLLECTIONS.USER_NOTES).createIndex({ userId: 1 });
    await db.collection(COLLECTIONS.USER_NOTES).createIndex({ noteId: 1 });
    
    // Attendance indexes
    await db.collection(COLLECTIONS.ATTENDANCE).createIndex({ session_id: 1, student_id: 1 }, { unique: true });
    
    // Grades indexes
    await db.collection(COLLECTIONS.GRADES).createIndex({ studentId: 1 });
    await db.collection(COLLECTIONS.GRADES).createIndex({ teacherId: 1 });
    await db.collection(COLLECTIONS.GRADES).createIndex({ sessionId: 1 });
    
    // Timetable indexes
    await db.collection(COLLECTIONS.TIMETABLE).createIndex({ day: 1, startTime: 1 });
    await db.collection(COLLECTIONS.TIMETABLE).createIndex({ teacherId: 1 });
    await db.collection(COLLECTIONS.TIMETABLE).createIndex({ classId: 1 });
    
    // Tickets indexes
    await db.collection(COLLECTIONS.TICKETS).createIndex({ userId: 1 });
    await db.collection(COLLECTIONS.TICKETS).createIndex({ status: 1 });
    
    // Ticket replies indexes
    await db.collection(COLLECTIONS.TICKET_REPLIES).createIndex({ ticketId: 1, createdAt: 1 });
    
    // Audit logs indexes
    await db.collection(COLLECTIONS.AUDIT_LOGS).createIndex({ userId: 1, ts: 1 });
    
    // Idempotency keys indexes
    await db.collection(COLLECTIONS.IDEMPOTENCY_KEYS).createIndex({ createdAt: 1 });
    
    console.log('MongoDB indexes created');
};

// CRUD Operations wrapper
export const mongoOps = {
    // Insert one document
    insertOne: async (collection, doc) => {
        const result = await getDB().collection(collection).insertOne(doc);
        return { id: result.insertedId, ...doc };
    },
    
    // Insert many documents
    insertMany: async (collection, docs) => {
        const result = await getDB().collection(collection).insertMany(docs);
        return result;
    },
    
    // Find one document
    findOne: async (collection, query, options = {}) => {
        return await getDB().collection(collection).findOne(query, options);
    },
    
    // Find many documents
    find: async (collection, query = {}, options = {}) => {
        return await getDB().collection(collection).find(query, options).toArray();
    },
    
    // Update one document
    updateOne: async (collection, query, update, options = {}) => {
        const result = await getDB().collection(collection).updateOne(query, update, options);
        return result;
    },
    
    // Update many documents
    updateMany: async (collection, query, update, options = {}) => {
        const result = await getDB().collection(collection).updateMany(query, update, options);
        return result;
    },
    
    // Delete one document
    deleteOne: async (collection, query) => {
        const result = await getDB().collection(collection).deleteOne(query);
        return result;
    },
    
    // Delete many documents
    deleteMany: async (collection, query) => {
        const result = await getDB().collection(collection).deleteMany(query);
        return result;
    },
    
    // Count documents
    count: async (collection, query = {}) => {
        return await getDB().collection(collection).countDocuments(query);
    },
    
    // Aggregate
    aggregate: async (collection, pipeline) => {
        return await getDB().collection(collection).aggregate(pipeline).toArray();
    },
};

// Default subjects to seed
export const DEFAULT_SUBJECTS = [
    { id: 'math', name: 'Mathematics' },
    { id: 'science', name: 'Science' },
    { id: 'history', name: 'History' },
    { id: 'english', name: 'English' },
];

// Seed default data
export const seedDefaults = async () => {
    const db = getDB();
    
    // Seed subjects if empty
    const subjectCount = await db.collection(COLLECTIONS.SUBJECTS).countDocuments();
    if (subjectCount === 0) {
        await db.collection(COLLECTIONS.SUBJECTS).insertMany(DEFAULT_SUBJECTS);
        console.log('Default subjects seeded');
    }
};

// Close connection
export const closeDB = async () => {
    if (client) {
        await client.close();
        client = null;
        db = null;
        console.log('MongoDB connection closed');
    }
};

export default {
    connectDB,
    getDB,
    getClient,
    generateId,
    COLLECTIONS,
    mongoOps,
    seedDefaults,
    closeDB,
};
