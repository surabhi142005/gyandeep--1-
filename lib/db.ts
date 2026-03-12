/**
 * lib/db.ts
 * MongoDB Atlas database client for Vercel serverless functions
 * Using a singleton pattern to reuse connections across function invocations.
 */

import { MongoClient, ObjectId, Db } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/gyandeep';
const MONGODB_DB = process.env.MONGODB_DB || 'gyandeep';

let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

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
};

export async function connectToDatabase(): Promise<Db> {
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

function toMongoId(id: string | undefined) {
  if (!id) return undefined;
  try {
    return new ObjectId(id);
  } catch {
    return id;
  }
}

function mapSession(session: any) {
  if (!session) return null;
  return {
    ...session,
    id: session._id?.toString() || session.id,
    expiry: session.expiry instanceof Date ? session.expiry : new Date(session.expiry),
    createdAt: session.createdAt instanceof Date ? session.createdAt : new Date(session.createdAt),
  };
}

export const prisma = {
  user: {
    findMany: async ({ where = {}, orderBy }: { where?: any; orderBy?: any } = {}) => {
      const db = await connectToDatabase();
      let query = db.collection(COLLECTIONS.USERS).find(where);
      if (orderBy) {
        const sortObj: any = {};
        for (const [key, value] of Object.entries(orderBy)) {
          sortObj[key] = value === 'desc' ? -1 : 1;
        }
        query = query.sort(sortObj);
      }
      const users = await query.toArray();
      return users.map((u: any) => ({ ...u, id: u._id?.toString() || u.id }));
    },
    findUnique: async ({ where, select }: { where: any; select?: any }) => {
      const db = await connectToDatabase();
      const query: any = { ...where };
      if (query.id) {
        query._id = toMongoId(query.id);
        delete query.id;
      }
      const user = await db.collection(COLLECTIONS.USERS).findOne(query);
      if (!user) return null;
      
      const result = { ...user, id: user._id?.toString() || user.id };
      if (select) {
        const selected: any = {};
        for (const key of Object.keys(select)) {
          selected[key] = result[key];
        }
        return selected;
      }
      return result;
    },
    create: async ({ data }: { data: any }) => {
      const db = await connectToDatabase();
      const doc = {
        ...data,
        _id: new ObjectId(),
        createdAt: new Date(),
        updatedAt: new Date(),
        active: data.active ?? true,
        emailVerified: data.emailVerified ?? false,
        preferences: data.preferences || {},
        history: data.history || [],
        assignedSubjects: data.assignedSubjects || [],
        performance: data.performance || [],
      };
      await db.collection(COLLECTIONS.USERS).insertOne(doc);
      return { id: doc._id.toString(), ...data };
    },
    update: async ({ where, data }: { where: any; data: any }) => {
      const db = await connectToDatabase();
      const query: any = { ...where };
      if (query.id) {
        query._id = toMongoId(query.id);
        delete query.id;
      }
      await db.collection(COLLECTIONS.USERS).updateOne(query, { $set: { ...data, updatedAt: new Date() } });
      return { ...data };
    },
    delete: async ({ where }: { where: any }) => {
      const db = await connectToDatabase();
      const query: any = { ...where };
      if (query.id) {
        query._id = toMongoId(query.id);
        delete query.id;
      }
      await db.collection(COLLECTIONS.USERS).deleteOne(query);
      return { success: true };
    },
  },

  classSession: {
    findMany: async ({ where = {}, orderBy, include }: { where?: any; orderBy?: any; include?: any } = {}) => {
      const db = await connectToDatabase();
      let query = db.collection(COLLECTIONS.CLASS_SESSIONS).find(where);
      if (orderBy) {
        const sortObj: any = {};
        for (const [key, value] of Object.entries(orderBy)) {
          sortObj[key] = value === 'desc' ? -1 : 1;
        }
        query = query.sort(sortObj);
      }
      const sessions = await query.toArray();

      if (include?.subject || include?.class) {
        const subjectIds = [...new Set(sessions.map((s: any) => s.subjectId).filter(Boolean))];
        const classIds = [...new Set(sessions.map((s: any) => s.classId).filter(Boolean))];

        const [subjects, classes] = await Promise.all([
          include.subject && subjectIds.length ? db.collection(COLLECTIONS.SUBJECTS).find({ id: { $in: subjectIds } }).toArray() : Promise.resolve([]),
          include.class && classIds.length ? db.collection(COLLECTIONS.CLASSES).find({ id: { $in: classIds } }).toArray() : Promise.resolve([]),
        ]);

        const subjectMap = new Map(subjects.map((s: any) => [s.id, s]));
        const classMap = new Map(classes.map((c: any) => [c.id, c]));

        return sessions.map((s: any) => ({
          ...s,
          id: s._id?.toString() || s.id,
          subject: subjectMap.get(s.subjectId) || null,
          class: classMap.get(s.classId) || null,
          expiry: s.expiry instanceof Date ? s.expiry : new Date(s.expiry),
          createdAt: s.createdAt instanceof Date ? s.createdAt : new Date(s.createdAt),
        }));
      }

      return sessions.map(mapSession);
    },

    findUnique: async ({ where }: { where: any }) => {
      const db = await connectToDatabase();
      const query: any = { ...where };
      if (query.id) {
        query._id = toMongoId(query.id);
        delete query.id;
      }
      const session = await db.collection(COLLECTIONS.CLASS_SESSIONS).findOne(query);
      return mapSession(session);
    },

    create: async ({ data }: { data: any }) => {
      const db = await connectToDatabase();
      const doc = {
        ...data,
        _id: new ObjectId(),
        quizPublished: data.quizPublished ?? false,
        sessionStatus: data.sessionStatus ?? 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await db.collection(COLLECTIONS.CLASS_SESSIONS).insertOne(doc);
      return { id: doc._id.toString(), ...data };
    },

    update: async ({ where, data }: { where: any; data: any }) => {
      const db = await connectToDatabase();
      const query: any = { ...where };
      if (query.id) {
        query._id = toMongoId(query.id);
        delete query.id;
      }
      await db.collection(COLLECTIONS.CLASS_SESSIONS).updateOne(query, { $set: { ...data, updatedAt: new Date() } });
      return { ...data };
    },

    delete: async ({ where }: { where: any }) => {
      const db = await connectToDatabase();
      const query: any = { ...where };
      if (query.id) {
        query._id = toMongoId(query.id);
        delete query.id;
      }
      await db.collection(COLLECTIONS.CLASS_SESSIONS).deleteOne(query);
      return { success: true };
    },
  },

  subject: {
    findMany: async ({ where = {}, orderBy }: { where?: any; orderBy?: any } = {}) => {
      const db = await connectToDatabase();
      let query = db.collection(COLLECTIONS.SUBJECTS).find(where);
      if (orderBy) {
        const sortObj: any = {};
        for (const [key, value] of Object.entries(orderBy)) {
          sortObj[key] = value === 'desc' ? -1 : 1;
        }
        query = query.sort(sortObj);
      }
      const subjects = await query.toArray();
      return subjects.map((s: any) => ({ ...s, id: s._id?.toString() || s.id }));
    },
  },

  class: {
    findMany: async ({ where = {}, orderBy }: { where?: any; orderBy?: any } = {}) => {
      const db = await connectToDatabase();
      let query = db.collection(COLLECTIONS.CLASSES).find(where);
      if (orderBy) {
        const sortObj: any = {};
        for (const [key, value] of Object.entries(orderBy)) {
          sortObj[key] = value === 'desc' ? -1 : 1;
        }
        query = query.sort(sortObj);
      }
      const classes = await query.toArray();
      return classes.map((c: any) => ({ ...c, id: c._id?.toString() || c.id }));
    },
  },

  grade: {
    findMany: async ({ where = {} }: { where?: any } = {}) => {
      const db = await connectToDatabase();
      const grades = await db.collection(COLLECTIONS.GRADES).find(where).toArray();
      return grades.map((g: any) => ({ ...g, id: g._id?.toString() || g.id }));
    },
    create: async ({ data }: { data: any }) => {
      const db = await connectToDatabase();
      const doc = {
        ...data,
        gradedAt: data.gradedAt || new Date(),
        _id: new ObjectId(),
        createdAt: new Date(),
      };
      await db.collection(COLLECTIONS.GRADES).insertOne(doc);
      return { id: doc._id.toString(), ...data };
    },
    update: async ({ where, data }: { where: any; data: any }) => {
      const db = await connectToDatabase();
      const query: any = { ...where };
      if (query.id) {
        query._id = toMongoId(query.id);
        delete query.id;
      }
      await db.collection(COLLECTIONS.GRADES).updateOne(query, { $set: { ...data, updatedAt: new Date() } });
      return data;
    },
    delete: async ({ where }: { where: any }) => {
      const db = await connectToDatabase();
      const query: any = { ...where };
      if (query.id) {
        query._id = toMongoId(query.id);
        delete query.id;
      }
      await db.collection(COLLECTIONS.GRADES).deleteOne(query);
      return { success: true };
    },
  },

  centralizedNote: {
    findMany: async ({ where = {} }: { where?: any } = {}) => {
      const db = await connectToDatabase();
      const notes = await db.collection(COLLECTIONS.CENTRALIZED_NOTES).find(where).toArray();
      return notes.map((n: any) => ({ ...n, id: n._id?.toString() || n.id }));
    },
    create: async ({ data }: { data: any }) => {
      const db = await connectToDatabase();
      const doc = {
        ...data,
        noteType: data.noteType || 'class_notes',
        _id: new ObjectId(),
        createdAt: new Date(),
      };
      await db.collection(COLLECTIONS.CENTRALIZED_NOTES).insertOne(doc);
      return { id: doc._id.toString(), ...data };
    },
  },

  sessionNote: {
    findMany: async ({ where = {} }: { where?: any } = {}) => {
      const db = await connectToDatabase();
      const notes = await db.collection(COLLECTIONS.SESSION_NOTES).find(where).toArray();
      return notes.map((n: any) => ({ ...n, id: n._id?.toString() || n.id }));
    },
    create: async ({ data }: { data: any }) => {
      const db = await connectToDatabase();
      const doc = {
        ...data,
        deletedAt: null,
        _id: new ObjectId(),
        createdAt: new Date(),
      };
      await db.collection(COLLECTIONS.SESSION_NOTES).insertOne(doc);
      return { id: doc._id.toString(), ...data };
    },
    updateMany: async ({ where, data }: { where: any; data: any }) => {
      const db = await connectToDatabase();
      const result = await db.collection(COLLECTIONS.SESSION_NOTES).updateMany(where, { $set: data });
      return { count: result.modifiedCount };
    },
    deleteMany: async ({ where }: { where: any }) => {
      const db = await connectToDatabase();
      const result = await db.collection(COLLECTIONS.SESSION_NOTES).deleteMany(where);
      return { count: result.deletedCount };
    },
  },

  quiz: {
    findMany: async ({ where = {} }: { where?: any } = {}) => {
      const db = await connectToDatabase();
      const quizzes = await db.collection(COLLECTIONS.QUIZZES).find(where).toArray();
      return quizzes.map((q: any) => ({ ...q, id: q._id?.toString() || q.id }));
    },
    findUnique: async ({ where }: { where: any }) => {
      const db = await connectToDatabase();
      const query: any = { ...where };
      if (query.id) {
        query._id = toMongoId(query.id);
        delete query.id;
      }
      const quiz = await db.collection(COLLECTIONS.QUIZZES).findOne(query);
      if (!quiz) return null;
      return { ...quiz, id: quiz._id?.toString() || quiz.id };
    },
    create: async ({ data }: { data: any }) => {
      const db = await connectToDatabase();
      const doc = {
        ...data,
        published: data.published ?? false,
        quizType: data.quizType || 'main',
        _id: new ObjectId(),
        createdAt: new Date(),
      };
      await db.collection(COLLECTIONS.QUIZZES).insertOne(doc);
      return { id: doc._id.toString(), ...data };
    },
    update: async ({ where, data }: { where: any; data: any }) => {
      const db = await connectToDatabase();
      const query: any = { ...where };
      if (query.id) {
        query._id = toMongoId(query.id);
        delete query.id;
      }
      await db.collection(COLLECTIONS.QUIZZES).updateOne(query, { $set: data });
      return data;
    },
  },

  quizQuestion: {
    findMany: async ({ where = {} }: { where?: any } = {}) => {
      const db = await connectToDatabase();
      const questions = await db.collection(COLLECTIONS.QUIZ_QUESTIONS).find(where).toArray();
      return questions.map((q: any) => ({ ...q, id: q._id?.toString() || q.id }));
    },
    createMany: async ({ data }: { data: any[] }) => {
      const db = await connectToDatabase();
      const docs = data.map((d, i) => ({
        ...d,
        orderIndex: d.orderIndex ?? i,
        _id: new ObjectId(),
      }));
      await db.collection(COLLECTIONS.QUIZ_QUESTIONS).insertMany(docs);
      return { count: docs.length };
    },
    deleteMany: async ({ where }: { where: any }) => {
      const db = await connectToDatabase();
      const result = await db.collection(COLLECTIONS.QUIZ_QUESTIONS).deleteMany(where);
      return { count: result.deletedCount };
    },
  },

  quizAttempt: {
    findMany: async ({ where = {} }: { where?: any } = {}) => {
      const db = await connectToDatabase();
      const attempts = await db.collection(COLLECTIONS.QUIZ_ATTEMPTS).find(where).toArray();
      return attempts.map((a: any) => ({ ...a, id: a._id?.toString() || a.id }));
    },
    findUnique: async ({ where }: { where: any }) => {
      const db = await connectToDatabase();
      const query: any = { ...where };
      if (query.id) {
        query._id = toMongoId(query.id);
        delete query.id;
      }
      const attempt = await db.collection(COLLECTIONS.QUIZ_ATTEMPTS).findOne(query);
      if (!attempt) return null;
      return { ...attempt, id: attempt._id?.toString() || attempt.id };
    },
    findFirst: async ({ where, orderBy }: { where: any; orderBy?: any }) => {
      const db = await connectToDatabase();
      const query: any = { ...where };
      if (query.id) {
        query._id = toMongoId(query.id);
        delete query.id;
      }
      let cursor = db.collection(COLLECTIONS.QUIZ_ATTEMPTS).find(query);
      if (orderBy) {
        const sortObj: any = {};
        for (const [key, value] of Object.entries(orderBy)) {
          sortObj[key] = value === 'desc' ? -1 : 1;
        }
        cursor = cursor.sort(sortObj);
      }
      const attempt = await cursor.limit(1).next();
      if (!attempt) return null;
      return { ...attempt, id: attempt._id?.toString() || attempt.id };
    },
    count: async ({ where = {} }: { where?: any } = {}) => {
      const db = await connectToDatabase();
      return db.collection(COLLECTIONS.QUIZ_ATTEMPTS).countDocuments(where);
    },
    create: async ({ data }: { data: any }) => {
      const db = await connectToDatabase();
      const now = new Date();
      const doc = {
        ...data,
        startedAt: data.startedAt || now,
        submittedAt: data.submittedAt || now,
        attemptNumber: data.attemptNumber || 1,
        _id: new ObjectId(),
      };
      await db.collection(COLLECTIONS.QUIZ_ATTEMPTS).insertOne(doc);
      return { id: doc._id.toString(), ...data };
    },
    update: async ({ where, data }: { where: any; data: any }) => {
      const db = await connectToDatabase();
      const query: any = { ...where };
      if (query.id) {
        query._id = toMongoId(query.id);
        delete query.id;
      }
      const updateDoc: any = { $set: data };
      if (data.submittedAt && data.startedAt && !data.timeTakenSeconds) {
        const startTime = new Date(data.startedAt).getTime();
        const endTime = new Date(data.submittedAt).getTime();
        updateDoc.$set.timeTakenSeconds = Math.floor((endTime - startTime) / 1000);
      }
      await db.collection(COLLECTIONS.QUIZ_ATTEMPTS).updateOne(query, updateDoc);
      return data;
    },
  },

  attendance: {
    findMany: async ({ where = {} }: { where?: any } = {}) => {
      const db = await connectToDatabase();
      const records = await db.collection(COLLECTIONS.ATTENDANCE).find(where).toArray();
      return records.map((a: any) => ({ ...a, id: a._id?.toString() || a.id }));
    },
    create: async ({ data }: { data: any }) => {
      const db = await connectToDatabase();
      const doc = {
        ...data,
        status: data.status || 'present',
        markedAt: data.markedAt || new Date(),
        verifiedAt: data.verifiedAt || null,
        _id: new ObjectId(),
      };
      await db.collection(COLLECTIONS.ATTENDANCE).insertOne(doc);
      return { id: doc._id.toString(), ...data };
    },
    createMany: async ({ data }: { data: any[] }) => {
      const db = await connectToDatabase();
      const now = new Date();
      const docs = data.map(d => ({
        ...d,
        status: d.status || 'present',
        markedAt: d.markedAt || now,
        verifiedAt: d.verifiedAt || null,
        _id: new ObjectId(),
      }));
      await db.collection(COLLECTIONS.ATTENDANCE).insertMany(docs, { ordered: false });
      return { count: docs.length };
    },
    update: async ({ where, data }: { where: any; data: any }) => {
      const db = await connectToDatabase();
      const query: any = { ...where };
      if (query.id) {
        query._id = toMongoId(query.id);
        delete query.id;
      }
      await db.collection(COLLECTIONS.ATTENDANCE).updateOne(query, { $set: data });
      return data;
    },
    upsert: async ({ where, update, create }: { where: any; update: any; create: any }) => {
      const db = await connectToDatabase();
      // Special handling for the unique compound index sessionId_studentId
      const result = await db.collection(COLLECTIONS.ATTENDANCE).findOneAndUpdate(
        where,
        { $set: update, $setOnInsert: { ...create, _id: new ObjectId() } },
        { upsert: true, returnDocument: 'after' }
      );
      return result;
    }
  },

  ticket: {
    findMany: async ({ where = {} }: { where?: any } = {}) => {
      const db = await connectToDatabase();
      const tickets = await db.collection(COLLECTIONS.TICKETS).find(where).toArray();
      return tickets.map((t: any) => ({ ...t, id: t._id?.toString() || t.id }));
    },
    findUnique: async ({ where }: { where: any }) => {
      const db = await connectToDatabase();
      const query: any = { ...where };
      if (query.id) {
        query._id = toMongoId(query.id);
        delete query.id;
      }
      const ticket = await db.collection(COLLECTIONS.TICKETS).findOne(query);
      if (!ticket) return null;
      return { ...ticket, id: ticket._id?.toString() || ticket.id };
    },
    create: async ({ data }: { data: any }) => {
      const db = await connectToDatabase();
      const doc = {
        ...data,
        status: 'open',
        priority: data.priority || 'medium',
        version: 1,
        _id: new ObjectId(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await db.collection(COLLECTIONS.TICKETS).insertOne(doc);
      return { id: doc._id.toString(), ...data };
    },
    update: async ({ where, data }: { where: any; data: any }) => {
      const db = await connectToDatabase();
      const query: any = { ...where };
      if (query.id) {
        query._id = toMongoId(query.id);
        delete query.id;
      }
      const updateDoc: any = { $set: { ...data, updatedAt: new Date() }, $inc: { version: 1 } };
      if (data.status === 'resolved' && !data.resolvedAt) {
        updateDoc.$set.resolvedAt = new Date();
      }
      await db.collection(COLLECTIONS.TICKETS).updateOne(query, updateDoc);
      return data;
    },
  },

  notification: {
    findMany: async ({ where = {}, orderBy }: { where?: any; orderBy?: any } = {}) => {
      const db = await connectToDatabase();
      let query = db.collection(COLLECTIONS.NOTIFICATIONS).find(where);
      if (orderBy) {
        const sortObj: any = {};
        for (const [key, value] of Object.entries(orderBy)) {
          sortObj[key] = value === 'desc' ? -1 : 1;
        }
        query = query.sort(sortObj);
      }
      const notifications = await query.toArray();
      return notifications.map((n: any) => ({ ...n, id: n._id?.toString() || n.id }));
    },
    create: async ({ data }: { data: any }) => {
      const db = await connectToDatabase();
      const doc = {
        ...data,
        read: false,
        _id: new ObjectId(),
        createdAt: new Date(),
      };
      await db.collection(COLLECTIONS.NOTIFICATIONS).insertOne(doc);
      return { id: doc._id.toString(), ...data };
    },
    update: async ({ where, data }: { where: any; data: any }) => {
      const db = await connectToDatabase();
      const query: any = { ...where };
      if (query.id) {
        query._id = toMongoId(query.id);
        delete query.id;
      }
      const updateDoc: any = { $set: data };
      if (data.read && !data.readAt) {
        updateDoc.$set.readAt = new Date();
      }
      await db.collection(COLLECTIONS.NOTIFICATIONS).updateOne(query, updateDoc);
      return data;
    },
    deleteMany: async ({ where }: { where: any }) => {
      const db = await connectToDatabase();
      const result = await db.collection(COLLECTIONS.NOTIFICATIONS).deleteMany(where);
      return { count: result.deletedCount };
    },
  },

  announcement: {
    findMany: async ({ where = {}, orderBy }: { where?: any; orderBy?: any } = {}) => {
      const db = await connectToDatabase();
      let query = db.collection(COLLECTIONS.ANNOUNCEMENTS).find(where);
      if (orderBy) {
        const sortObj: any = {};
        for (const [key, value] of Object.entries(orderBy)) {
          sortObj[key] = value === 'desc' ? -1 : 1;
        }
        query = query.sort(sortObj);
      }
      const announcements = await query.toArray();
      return announcements.map((a: any) => ({ ...a, id: a._id?.toString() || a.id }));
    },
    create: async ({ data }: { data: any }) => {
      const db = await connectToDatabase();
      const doc = {
        ...data,
        _id: new ObjectId(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await db.collection(COLLECTIONS.ANNOUNCEMENTS).insertOne(doc);
      return { id: doc._id.toString(), ...data };
    },
    delete: async ({ where }: { where: any }) => {
      const db = await connectToDatabase();
      const query: any = { ...where };
      if (query.id) {
        query._id = toMongoId(query.id);
        delete query.id;
      }
      await db.collection(COLLECTIONS.ANNOUNCEMENTS).deleteOne(query);
      return { success: true };
    },
  },

  activityLog: {
    create: async ({ data }: { data: any }) => {
      const db = await connectToDatabase();
      const doc = {
        ...data,
        _id: new ObjectId(),
        createdAt: new Date(),
      };
      await db.collection(COLLECTIONS.ACTIVITY_LOGS).insertOne(doc);
      return { id: doc._id.toString(), ...data };
    },
  },

  timetableEntry: {
    findMany: async ({ where = {}, orderBy }: { where?: any; orderBy?: any } = {}) => {
      const db = await connectToDatabase();
      let query = db.collection(COLLECTIONS.TIMETABLE).find(where);
      if (orderBy) {
        const sortObj: any = {};
        for (const [key, value] of Object.entries(orderBy)) {
          sortObj[key] = value === 'desc' ? -1 : 1;
        }
        query = query.sort(sortObj);
      }
      const entries = await query.toArray();
      return entries.map((e: any) => ({ ...e, id: e._id?.toString() || e.id }));
    },
    create: async ({ data }: { data: any }) => {
      const db = await connectToDatabase();
      const doc = {
        ...data,
        _id: new ObjectId(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await db.collection(COLLECTIONS.TIMETABLE).insertOne(doc);
      return { id: doc._id.toString(), ...data };
    },
    update: async ({ where, data }: { where: any; data: any }) => {
      const db = await connectToDatabase();
      const query: any = { ...where };
      if (query.id) {
        query._id = toMongoId(query.id);
        delete query.id;
      }
      await db.collection(COLLECTIONS.TIMETABLE).updateOne(query, { $set: { ...data, updatedAt: new Date() } });
      return data;
    },
    delete: async ({ where }: { where: any }) => {
      const db = await connectToDatabase();
      const query: any = { ...where };
      if (query.id) {
        query._id = toMongoId(query.id);
        delete query.id;
      }
      await db.collection(COLLECTIONS.TIMETABLE).deleteOne(query);
      return { success: true };
    },
  },
};

export async function findUserByEmail(email: string) {
  return prisma.user.findUnique({ where: { email } });
}

export async function findUserById(id: string) {
  return prisma.user.findUnique({ where: { id } });
}

export async function createUser(data: {
  name: string;
  email: string;
  password?: string;
  role?: string;
  googleId?: string;
}) {
  return prisma.user.create({ data });
}

export async function updateUser(id: string, data: Partial<{
  name: string;
  email: string;
  password: string;
  faceImage: string;
  preferences: object;
  active: boolean;
  classId: string;
  assignedSubjects: string[];
}>) {
  return prisma.user.update({ where: { id }, data });
}

export async function getClasses() {
  return prisma.class.findMany({ orderBy: { name: 'asc' } });
}

export async function getSubjects() {
  return prisma.subject.findMany({ orderBy: { name: 'asc' } });
}

export async function getStudentsByClass(classId: string) {
  return prisma.user.findMany({
    where: { classId, role: 'student', active: true },
    orderBy: { name: 'asc' }
  });
}

export async function getSessionByCode(code: string) {
  return prisma.classSession.findUnique({
    where: { code },
  });
}

export async function getSessionById(id: string) {
  return prisma.classSession.findUnique({
    where: { id },
  });
}

export async function getQuizBySession(sessionId: string) {
  const quizzes = await prisma.quiz.findMany({ where: { sessionId } });
  if (!quizzes.length) return [];

  const quizzesWithQuestions = await Promise.all(
    quizzes.map(async (quiz: any) => {
      const questions = await prisma.quizQuestion.findMany({
        where: { quizId: quiz.id },
      });
      return { ...quiz, questions };
    })
  );
  return quizzesWithQuestions;
}

export async function getQuizzesBySessionAndType(sessionId: string, quizType: string) {
  const quizzes = await prisma.quiz.findMany({ where: { sessionId, quizType } });
  return quizzes;
}

export async function getQuizAttempts(quizId: string) {
  return prisma.quizAttempt.findMany({ where: { quizId } });
}

export default prisma;
