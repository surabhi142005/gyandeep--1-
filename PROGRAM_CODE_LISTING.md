================================================================================
                        GYANDEEP PROGRAM CODE LISTING
================================================================================

================================================================================
a. DATABASE CONNECTION
================================================================================

// server/db/mongoAtlas.js
import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB = process.env.MONGODB_DB || 'gyandeep';

const POOL_CONFIG = {
  minPoolSize: process.env.NODE_ENV === 'production' ? 5 : 1,
  maxPoolSize: process.env.NODE_ENV === 'production' ? 50 : 10,
  maxIdleTimeMS: 30000,
  connectTimeoutMS: 10000,
  socketTimeoutMS: 45000,
};

let cachedClient = null;
let cachedDb = null;

export const COLLECTIONS = {
  USERS: 'users',
  CLASSES: 'classes',
  SUBJECTS: 'subjects',
  CLASS_SESSIONS: 'class_sessions',
  QUIZZES: 'quizzes',
  ATTENDANCE: 'attendance',
  GRADES: 'grades',
  NOTIFICATIONS: 'notifications',
};

export async function connectToDatabase() {
  if (cachedDb) return cachedDb;
  
  if (!cachedClient) {
    cachedClient = new MongoClient(MONGODB_URI, POOL_CONFIG);
    cachedClient.on('connectionPoolCreated', (e) => {
      console.log(`[MongoDB] Pool created: ${e.options.maxPoolSize}`);
    });
    await cachedClient.connect();
    console.log('[MongoDB] Connected');
  }
  
  cachedDb = cachedClient.db(MONGODB_DB);
  return cachedDb;
}

export default connectToDatabase;

================================================================================
b. AUTHORIZATION / AUTHENTICATION
================================================================================

// server/middleware/auth.js
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
const TOKEN_COOKIE_NAME = 'gyandeep_token';

export const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true,
  sameSite: 'none',
  path: '/',
};

export function extractToken(req) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  return req.cookies?.[TOKEN_COOKIE_NAME];
}

export async function authMiddleware(req, res, next) {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    req.userId = decoded.id;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
}

export default authMiddleware;

// server/routes/auth.js
import express from 'express';
const router = express.Router();
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { connectToDatabase, COLLECTIONS } from '../db/mongoAtlas.js';
import { authMiddleware, setAuthCookies } from '../middleware/auth.js';

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

function signAccessToken(user) {
  return jwt.sign(
    { id: user._id.toString(), email: user.email, role: user.role, name: user.name },
    JWT_SECRET,
    { expiresIn: '15m' }
  );
}

function signRefreshToken(userId) {
  return jwt.sign(
    { id: userId, type: 'refresh', iat: Date.now() },
    JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );
}

function generateTokenPair(user) {
  return {
    accessToken: signAccessToken(user),
    refreshToken: signRefreshToken(user._id.toString()),
  };
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, password required' });
    }

    const db = await connectToDatabase();
    const existing = await db.collection(COLLECTIONS.USERS).findOne({ email });
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const result = await db.collection(COLLECTIONS.USERS).insertOne({
      name,
      email,
      password: hashedPassword,
      role: role || 'student',
      xp: 0,
      coins: 0,
      level: 1,
      streak: 0,
      active: true,
      emailVerified: false,
      createdAt: new Date(),
    });

    const user = { _id: result.insertedId, name, email, role: role || 'student' };
    const tokens = generateTokenPair(user);
    setAuthCookies(res, tokens.accessToken, tokens.refreshToken);

    res.json({ ...tokens, user: { id: user._id.toString(), name, email, role: user.role } });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const db = await connectToDatabase();
    const user = await db.collection(COLLECTIONS.USERS).findOne({ email });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!user.active) {
      return res.status(403).json({ error: 'Account is deactivated' });
    }

    const tokens = generateTokenPair(user);
    setAuthCookies(res, tokens.accessToken, tokens.refreshToken);

    res.json({
      ...tokens,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        xp: user.xp,
        level: user.level,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// GET /api/auth/me
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const db = await connectToDatabase();
    const user = await db.collection(COLLECTIONS.USERS).findOne(
      { _id: req.user.id },
      { projection: { password: 0 } }
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ success: true, user: { id: user._id.toString(), name: user.name, email: user.email, role: user.role, xp: user.xp, level: user.level } });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.clearCookie(TOKEN_COOKIE_NAME, COOKIE_OPTIONS);
  res.json({ success: true });
});

export default router;

================================================================================
c. DATA STORE/RETRIEVES/UPDATE
================================================================================

// server/routes/users.js
import express from 'express';
const router = express.Router();
import { ObjectId } from 'mongodb';
import { connectToDatabase, COLLECTIONS } from '../db/mongoAtlas.js';
import { authMiddleware } from '../middleware/auth.js';

// POST /api/users - Create user
router.post('/', async (req, res) => {
  try {
    const db = await connectToDatabase();
    const result = await db.collection(COLLECTIONS.USERS).insertOne(req.body);
    res.status(201).json({ id: result.insertedId, success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/users - Get all users
router.get('/', async (req, res) => {
  try {
    const db = await connectToDatabase();
    const users = await db.collection(COLLECTIONS.USERS).find({}).toArray();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/users/:id - Get user by ID
router.get('/:id', async (req, res) => {
  try {
    const db = await connectToDatabase();
    const user = await db.collection(COLLECTIONS.USERS).findOne({ _id: new ObjectId(req.params.id) });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/users/:id - Update user
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const db = await connectToDatabase();
    const result = await db.collection(COLLECTIONS.USERS).updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { ...req.body, updatedAt: new Date() } }
    );
    res.json({ success: result.modifiedCount > 0 });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/users/:id - Delete user
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const db = await connectToDatabase();
    const result = await db.collection(COLLECTIONS.USERS).deleteOne({ _id: new ObjectId(req.params.id) });
    res.json({ success: result.deletedCount > 0 });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

================================================================================
d. DATA VALIDATION
================================================================================

// server/middleware/validate.js
import { body, param, validationResult } from 'express-validator';

export const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

export const registerValidation = [
  body('name').isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 chars'),
  body('email').isEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 8 }).withMessage('Password min 8 chars'),
  validate,
];

export const loginValidation = [
  body('email').isEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password required'),
  validate,
];

export const idValidation = [
  param('id').isMongoId().withMessage('Valid ID required'),
  validate,
];

// Usage in routes:
// router.post('/register', registerValidation, registerUser);

================================================================================
e. PROCEDURES/FUNCTIONS
================================================================================

// server/services/llmService.js
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function generateQuiz(topic, gradeLevel, numQuestions = 10) {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const prompt = `
    Generate ${numQuestions} multiple choice questions for ${gradeLevel} students on: ${topic}.
    Each question: 4 options (A-D), one correct answer.
    Return JSON: question, options[], correctAnswer, difficulty.
  `;

  const result = await model.generateContent(prompt);
  const response = result.response.text();
  
  try {
    return JSON.parse(response);
  } catch {
    throw new Error('Failed to parse AI response');
  }
}

export default { generateQuiz };

// server/services/emailService.js
import Resend from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendWelcomeEmail(email, name) {
  return resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL || 'noreply@gyandeep.edu',
    to: email,
    subject: 'Welcome to Gyandeep!',
    html: `<h1>Welcome, ${name}!</h1><p>Start your learning journey...</p>`,
  });
}

export async function sendOTPEmail(email, otp) {
  return resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL,
    to: email,
    subject: 'Your Gyandeep OTP',
    html: `<p>Your OTP: <strong>${otp}</strong></p><p>Valid 10 minutes</p>`,
  });
}

export default { sendWelcomeEmail, sendOTPEmail };

================================================================================
f. INTERFACING WITH EXTERNAL SERVICES
================================================================================

// server/routes/ai.js
import express from 'express';
const router = express.Router();
import { generateQuiz } from '../services/llmService.js';
import { authMiddleware } from '../middleware/auth.js';
import { connectToDatabase, COLLECTIONS } from '../db/mongoAtlas.js';

// POST /api/ai/generate-quiz
router.post('/generate-quiz', authMiddleware, async (req, res) => {
  try {
    const { topic, gradeLevel, numQuestions } = req.body;

    if (!topic || !gradeLevel) {
      return res.status(400).json({ error: 'Topic and grade level required' });
    }

    const questions = await generateQuiz(topic, gradeLevel, numQuestions || 10);

    const db = await connectToDatabase();
    const result = await db.collection(COLLECTIONS.QUIZZES).insertOne({
      title: `${topic} Quiz`,
      topic,
      gradeLevel,
      questions,
      createdBy: req.userId,
      createdAt: new Date(),
    });

    res.json({ success: true, quizId: result.insertedId, questions });
  } catch (error) {
    console.error('Quiz generation error:', error);
    res.status(500).json({ error: 'Failed to generate quiz' });
  }
});

export default router;

================================================================================
g. PASSING OF PARAMETERS
================================================================================

// Example parameter passing in routes

// 1. From req.params (URL path parameters)
router.get('/users/:id', authMiddleware, (req, res) => {
  const userId = req.params.id;  // URL path parameter
});

// 2. From req.body (POST/PUT body)
router.post('/quiz/:quizId/attempt', authMiddleware, (req, res) => {
  const quizId = req.params.quizId;  // Path
  const { answers } = req.body;      // Body
  const studentId = req.userId;      // From JWT
});

// 3. From req.query (URL query string)
router.get('/users', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const role = req.query.role;       // Filter
});

// Full flow example:
// POST /api/quiz/507f1f77bcf86cd799439011/attempt?attemptNumber=1
// req.params.quizId = "507f1f77bcf86cd799439011"
// req.body.answers = [{q1: "A"}, {q2: "C"}]
// req.userId = "user_from_jwt"
// req.query.attemptNumber = "1"

================================================================================
h. BACKUP / RECOVERY
================================================================================

// Manual MongoDB Atlas Backup
# For local dev:
mongodump --uri="mongodb+srv://<username>:<password>@cluster0.xxxx.mongodb.net/gyandeep" --out=./backup

# Restore:
mongorestore --uri="mongodb+srv://<username>:<password>@cluster0.xxxx.mongodb.net/gyandeep" ./backup

# Automated via MongoDB Atlas:
// Settings -> Backup -> Configure automatic backups

// Application-level backup endpoint (Admin)
router.get('/admin/backup', authMiddleware, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const db = await connectToDatabase();
  const backup = {};
  for (const [key, coll] of Object.entries(COLLECTIONS)) {
    backup[coll] = await db.collection(coll).find({}).toArray();
  }

  res.setHeader('Content-Disposition', `attachment; filename=backup-${Date.now()}.json`);
  res.json(backup);
});

================================================================================
i. INTERNAL DOCUMENTATION
================================================================================

/**
 * connectToDatabase
 * Establishes MongoDB Atlas connection with pooling.
 * 
 * @returns {Promise<Db>} Database instance
 * @throws {Error} If MONGODB_URI not set
 * @example
 * const db = await connectToDatabase();
 * const users = await db.collection('users').find({}).toArray();
 */
export async function connectToDatabase() { }

/**
 * authMiddleware
 * JWT authentication middleware.
 * Attaches user data to req.user and req.userId on success.
 * 
 * @param {Request} req - Express request
 * @param {Response} res - Express response  
 * @param {Function} next - Express next
 * @returns {Object} JSON error or calls next()
 */

/**
 * generateQuiz
 * Generates quiz via Gemini AI.
 * 
 * @param {string} topic - Subject/topic
 * @param {string} gradeLevel - Grade (e.g. "Class 10")
 * @param {number} numQuestions - Questions count
 * @returns {Promise<Array>} Question arrays
 * @throws {Error} On API failure
 */

/**
 * sendWelcomeEmail
 * Sends welcome email via Resend.
 * 
 * @param {string} email - Recipient email
 * @param {string} name - Recipient name
 * @returns {Promise<Object>} Resend response
 */

================================================================================
                             END OF PROGRAM CODE LISTING
================================================================================