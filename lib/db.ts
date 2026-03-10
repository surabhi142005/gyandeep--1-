/**
 * lib/db.ts
 * MongoDB Atlas database client for Vercel serverless functions
 */

import { connectToDatabase, COLLECTIONS } from '../server/db/mongoAtlas';
import { ObjectId } from 'mongodb';

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
    findUnique: async ({ where }: { where: any }) => {
      const db = await connectToDatabase();
      const query: any = { ...where };
      if (query.id) {
        query._id = toMongoId(query.id);
        delete query.id;
      }
      const user = await db.collection(COLLECTIONS.USERS).findOne(query);
      if (!user) return null;
      return { ...user, id: user._id?.toString() || user.id };
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
        _id: new ObjectId(),
        createdAt: new Date(),
      };
      await db.collection(COLLECTIONS.GRADES).insertOne(doc);
      return { id: doc._id.toString(), ...data };
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
    create: async ({ data }: { data: any }) => {
      const db = await connectToDatabase();
      const doc = {
        ...data,
        submittedAt: new Date(),
        _id: new ObjectId(),
      };
      await db.collection(COLLECTIONS.QUIZ_ATTEMPTS).insertOne(doc);
      return { id: doc._id.toString(), ...data };
    },
  },

  attendance: {
    findMany: async ({ where = {} }: { where?: any } = {}) => {
      const db = await connectToDatabase();
      const records = await db.collection(COLLECTIONS.ATTENDANCE).find(where).toArray();
      return records.map((a: any) => ({ ...a, id: a._id?.toString() || a.id }));
    },
    createMany: async ({ data }: { data: any[] }) => {
      const db = await connectToDatabase();
      const docs = data.map(d => ({
        ...d,
        status: d.status || 'present',
        verifiedAt: d.verifiedAt || new Date(),
        _id: new ObjectId(),
      }));
      await db.collection(COLLECTIONS.ATTENDANCE).insertMany(docs, { ordered: false });
      return { count: docs.length };
    },
  },

  ticket: {
    findMany: async ({ where = {} }: { where?: any } = {}) => {
      const db = await connectToDatabase();
      const tickets = await db.collection(COLLECTIONS.TICKETS).find(where).toArray();
      return tickets.map((t: any) => ({ ...t, id: t._id?.toString() || t.id }));
    },
    create: async ({ data }: { data: any }) => {
      const db = await connectToDatabase();
      const doc = {
        ...data,
        status: 'open',
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
      await db.collection(COLLECTIONS.TICKETS).updateOne(query, { $set: { ...data, updatedAt: new Date() }, $inc: { version: 1 } });
      return data;
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
    include: { subject: true, class: true }
  });
}

export async function getSessionById(id: string) {
  return prisma.classSession.findUnique({
    where: { id },
    include: { subject: true, class: true, teacher: true }
  });
}

export async function getQuizBySession(sessionId: string) {
  const quiz = await prisma.quiz.findUnique({ where: { sessionId } });
  if (!quiz) return null;
  const questions = await prisma.quizQuestion.findMany({
    where: { quizId: quiz.id },
    orderBy: { orderIndex: 'asc' }
  });
  return { ...quiz, questions };
}

export async function getQuizAttempts(quizId: string) {
  return prisma.quizAttempt.findMany({ where: { quizId } });
}

export default prisma;
