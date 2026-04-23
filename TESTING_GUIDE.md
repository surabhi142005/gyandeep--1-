# GYANDEEP - PROGRAM CODE TESTING & IMPLEMENTATION

## 6. Program Code Testing

### a. Database Connection

```javascript
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

export async function connectToDatabase() {
  if (cachedDb) {
    return cachedDb;
  }

  if (!cachedClient) {
    cachedClient = new MongoClient(MONGODB_URI, POOL_CONFIG);
    
    cachedClient.on('connectionPoolCreated', (event) => {
      console.log(`[MongoDB] Connection pool created: ${event.options.maxPoolSize}`);
    });
    
    await cachedClient.connect();
    console.log('[MongoDB] Connected to Atlas');
  }

  cachedDb = cachedClient.db(MONGODB_DB);
  return cachedDb;
}

export default connectToDatabase;
```

**Usage in routes:**
```javascript
import { connectToDatabase, COLLECTIONS } from '../db/mongoAtlas.js';

// Example: Fetch users
const db = await connectToDatabase();
const users = await db.collection(COLLECTIONS.USERS).find({}).toArray();
```

---

### b. Authorization / Authentication

#### i. auth.js (Middleware)

```javascript
// server/middleware/auth.js
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
const TOKEN_COOKIE_NAME = 'gyandeep_token';
const REFRESH_COOKIE_NAME = 'gyandeep_refresh_token';

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

export async function optionalAuth(req, res, next) {
  const token = extractToken(req);

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    req.userId = decoded.id;
  } catch {
    req.user = null;
  }
  next();
}

export function setAuthCookies(res, accessToken, refreshToken) {
  res.cookie(TOKEN_COOKIE_NAME, accessToken, {
    ...COOKIE_OPTIONS,
    maxAge: 15 * 60 * 1000, // 15 minutes
  });

  res.cookie(REFRESH_COOKIE_NAME, refreshToken, {
    ...COOKIE_OPTIONS,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
}

export default authMiddleware;
```

#### ii. auth.js (Routes/Controller)

```javascript
// server/routes/auth.js
import express from 'express';
const router = express.Router();
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { connectToDatabase, COLLECTIONS } from '../db/mongoAtlas.js';
import { authMiddleware, setAuthCookies, extractToken } from '../middleware/auth.js';

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

function sanitize(input) {
  if (typeof input !== 'string') return '';
  return input.trim().slice(0, 10000);
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// API to register user
router.post('/register', async (req, res) => {
  try {
    const name = sanitize(req.body.name);
    const email = sanitize(req.body.email);
    const password = req.body.password;
    const role = sanitize(req.body.role) || 'student';

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Password validation
    if (password.length < 8 || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
      return res.status(400).json({ error: 'Password must be at least 8 characters with uppercase and number' });
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
      role,
      xp: 0,
      coins: 0,
      level: 1,
      streak: 0,
      active: true,
      emailVerified: false,
      createdAt: new Date(),
    });

    const user = { _id: result.insertedId, name, email, role };
    const tokens = generateTokenPair(user);
    setAuthCookies(res, tokens.accessToken, tokens.refreshToken);

    res.json({
      ...tokens,
      user: { id: user._id.toString(), name: user.name, email: user.email, role: user.role },
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// API to login user
router.post('/login', async (req, res) => {
  try {
    const email = sanitize(req.body.email);
    const password = req.body.password;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const db = await connectToDatabase();
    const user = await db.collection(COLLECTIONS.USERS).findOne({ email });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!user.password) {
      return res.status(401).json({ error: 'Please use OAuth login' });
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
        streak: user.streak,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// API to get user profile
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

    res.json({
      success: true,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        xp: user.xp,
        coins: user.coins,
        level: user.level,
        streak: user.streak,
      },
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

// API to refresh token
router.post('/refresh', async (req, res) => {
  try {
    let refreshToken = req.body?.refreshToken || req.cookies?.[REFRESH_COOKIE_NAME];

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token required' });
    }

    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
    if (decoded.type !== 'refresh') {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    const db = await connectToDatabase();
    const user = await db.collection(COLLECTIONS.USERS).findOne(
      { _id: decoded.id },
      { projection: { password: 0 } }
    );

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    const tokens = generateTokenPair(user);
    setAuthCookies(res, tokens.accessToken, tokens.refreshToken);

    res.json({
      ...tokens,
      user: { id: user._id.toString(), name: user.name, email: user.email, role: user.role },
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(401).json({ error: 'Invalid or expired refresh token' });
  }
});

// API to logout
router.post('/logout', (req, res) => {
  res.clearCookie(TOKEN_COOKIE_NAME, COOKIE_OPTIONS);
  res.clearCookie(REFRESH_COOKIE_NAME, COOKIE_OPTIONS);
  res.json({ success: true });
});

export default router;
```

---

### c. Data Store/Retrieves/Update

```javascript
// server/routes/users.js
import express from 'express';
const router = express.Router();
import { ObjectId } from 'mongodb';
import { connectToDatabase, COLLECTIONS } from '../db/mongoAtlas.js';
import { authMiddleware } from '../middleware/auth.js';

// Store new user data
router.post('/', async (req, res) => {
  try {
    const db = await connectToDatabase();
    const result = await db.collection(COLLECTIONS.USERS).insertOne(req.body);
    res.status(201).json({ id: result.insertedId, success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Retrieve all users
router.get('/', async (req, res) => {
  try {
    const db = await connectToDatabase();
    const users = await db.collection(COLLECTIONS.USERS).find({}).toArray();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Retrieve single user by ID
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

// Update user
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

// Delete user
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
```

---

### d. Data Validation

```javascript
// server/middleware/validate.js
import { body, param, query, validationResult } from 'express-validator';

export const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// User registration validation
export const registerValidation = [
  body('name').isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),
  body('email').isEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  validate,
];

// Login validation
export const loginValidation = [
  body('email').isEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password required'),
  validate,
];

// ID parameter validation
export const idValidation = [
  param('id').isMongoId().withMessage('Valid ID required'),
  validate,
];

// Query validation
export const paginationValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100'),
  validate,
];

// Note creation validation
export const noteValidation = [
  body('title').isLength({ min: 1, max: 200 }).withMessage('Title required'),
  body('classId').isMongoId().withMessage('Valid class ID required'),
  body('subjectId').isMongoId().withMessage('Valid subject ID required'),
  validate,
];

// Quiz submission validation
export const quizSubmitValidation = [
  body('quizId').isMongoId().withMessage('Valid quiz ID required'),
  body('answers').isArray().withMessage('Answers must be an array'),
  validate,
];
```

---

### e. Procedures/Functions

```javascript
// server/services/llmService.js
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function generateQuiz(topic, gradeLevel, numQuestions = 10) {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const prompt = `
    Generate ${numQuestions} multiple choice questions for ${gradeLevel} students on the topic: ${topic}.
    Each question should have 4 options (A, B, C, D) with one correct answer.
    Return JSON array with: question, options[], correctAnswer, difficulty (easy/medium/hard).
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
```

```javascript
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
    html: `<p>Your OTP is: <strong>${otp}</strong></p><p>Valid for 10 minutes.</p>`,
  });
}

export default { sendWelcomeEmail, sendOTPEmail };
```

---

### f. Interfacing with External Services

```javascript
// server/routes/ai.js
import express from 'express';
const router = express.Router';
import { generateQuiz } from '../services/llmService.js';
import { authMiddleware } from '../middleware/auth.js';
import { connectToDatabase, COLLECTIONS } from '../db/mongoAtlas.js';

// AI Quiz Generation
router.post('/generate-quiz', authMiddleware, async (req, res) => {
  try {
    const { topic, gradeLevel, numQuestions } = req.body;

    if (!topic || !gradeLevel) {
      return res.status(400).json({ error: 'Topic and grade level required' });
    }

    const questions = await generateQuiz(topic, gradeLevel, numQuestions || 10);

    // Store quiz in database
    const db = await connectToDatabase();
    const result = await db.collection(COLLECTIONS.QUIZZES).insertOne({
      title: `${topic} Quiz`,
      topic,
      gradeLevel,
      questions,
      createdBy: req.userId,
      createdAt: new Date(),
    });

    res.json({
      success: true,
      quizId: result.insertedId,
      questions,
    });
  } catch (error) {
    console.error('Quiz generation error:', error);
    res.status(500).json({ error: 'Failed to generate quiz' });
  }
});

export default router;
```

---

### g. Passing of Parameters

**Example route with parameter passing:**
```javascript
// Route Definition
router.post('/quiz/:quizId/attempt', authMiddleware, quizSubmitValidation, async (req, res) => {
  // Parameters passed:
  // 1. From req.params (URL path)
  const quizId = req.params.quizId;
  
  // 2. From req.body (POST body)
  const { answers } = req.body;
  
  // 3. From req.user (JWT token)
  const studentId = req.user.id;
  
  // 4. From req.query (URL query string)
  const attemptNumber = req.query.attemptNumber || 1;
  
  // Processing...
  const result = await submitQuizAttempt(quizId, studentId, answers, attemptNumber);
  
  res.json(result);
});

// Parameters flow:
// Frontend -> HTTP POST -> Middleware Stack -> Controller -> Service -> Database
// req.body (text prompt) | req.user.id (from JWT) | req.params.id (from URL)
```

---

### h. Backup / Recovery

```bash
# Manual MongoDB Atlas Backup

# For local dev:
mongodump --uri="mongodb+srv://<username>:<password>@cluster0.xxxx.mongodb.net/gyandeep" --out=./backup

# Restore:
mongorestore --uri="mongodb+srv://<username>:<password>@cluster0.xxxx.mongodb.net/gyandeep" ./backup

# Automated via MongoDB Atlas (Settings -> Backup)
```

```javascript
// Application-level backup endpoint (Admin only)
router.get('/admin/backup', authMiddleware, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const db = await connectToDatabase();
  
  // Export all collections
  const backup = {};
  for (const collection of Object.values(COLLECTIONS)) {
    backup[collection] = await db.collection(collection).find({}).toArray();
  }

  res.setHeader('Content-Disposition', `attachment; filename=backup-${Date.now()}.json`);
  res.json(backup);
});
```

---

### i. Internal Documentation (Examples)

```javascript
/**
 * connectToDatabase
 * Establishes connection to MongoDB Atlas database.
 * Uses connection pooling for production performance.
 * 
 * @returns {Promise<Db>} MongoDB database instance
 * @throws {Error} If MONGODB_URI is not set
 * 
 * @example
 * const db = await connectToDatabase();
 * const users = await db.collection('users').find({}).toArray();
 */
export async function connectToDatabase() {
  // Implementation here...
}

/**
 * authMiddleware
 * Authentication middleware that verifies JWT tokens.
 * Attaches user data to req.user and req.userId on success.
 * 
 * @param {Request} req - Express request with authorization header or cookie
 * @param {Response} res - Express response
 * @param {Function} next - Express next function
 * @returns {Object} JSON with error or calls next()
 */
export async function authMiddleware(req, res, next) {
  // Implementation here...
}

/**
 * generateQuiz
 * Generates quiz questions using Gemini AI.
 * 
 * @param {string} topic - Subject/topic name
 * @param {string} gradeLevel - Grade level (e.g., "Class 10")
 * @param {number} numQuestions - Number of questions to generate
 * @returns {Promise<Array>} Array of question objects
 * @throws {Error} If API call fails or response is unparseable
 */
export async function generateQuiz(topic, gradeLevel, numQuestions = 10) {
  // Implementation here...
}
```

---

## Testing Summary

| Module | Test Type | Test Cases |
|--------|-----------|------------|
| Database Connection | Unit | Connection to Atlas, Connection pooling, Error handling |
| Authentication | Integration | Register, Login, Token refresh, Logout, Password reset |
| Authorization | Unit | Valid token, Expired token, Invalid token, Missing token |
| User CRUD | Integration | Create, Read, Update, Delete user |
| Data Validation | Unit | Email format, Password strength, MongoDB ID format |
| External API | Integration | Quiz generation, Email sending |
| Backup/Recovery | Manual | Export data, Import data |