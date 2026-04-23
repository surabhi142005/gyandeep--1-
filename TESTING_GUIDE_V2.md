================================================================================
6. PROGRAM CODE TESTING
================================================================================

## Introduction (BriefWrite-up About Software Testing)

Software testing is a critical phase in the development process that ensures the application behaves as expected, meets the requirements, and is free of bugs or vulnerabilities. In the case of the Gyandeep EduTech Platform, testing was conducted at multiple levels to validate the correctness, performance, and reliability of the system. The platform includes authentication, quiz generation, attendance tracking, grade management, and AI-powered features that require thorough validation.

## i. Unit Testing

Unit testing involves testing individual functions or components in isolation. In this project:
- Functions for user authentication, prompt validation, quiz generation, and grade calculation were tested independently.
- Tools used: Jest, Vitest, and Mocha for JavaScript/TypeScript testing.

Example:
```javascript
test("validate user email", () => {
  const isValid = isValidEmail("test@gyandeep.edu");
  expect(isValid).toBe(true);
});

test("validate password strength", () => {
  const result = validatePassword("Password123");
  expect(result.valid).toBe(true);
});

test("calculate quiz score", () => {
  const score = calculateQuizScore(answers, correctAnswers);
  expect(score).toBe(85);
});
```

## ii. Integration Testing

Integration testing verifies the interactions between modules:
- Ensured the backend API properly integrates with MongoDB, the Gemini AI API, and the frontend.
- Focused on flows like: user login → quiz generation → submission → grading
- Register → Login → Submit Prompt → Get Response

Example:
```javascript
// Login → Submit Prompt → Get Response
test("full quiz generation flow", async () => {
  const login = await request.post('/api/auth/login').send(credentials);
  expect(login.status).toBe(200);
  
  const quiz = await request.post('/api/ai/generate-quiz')
    .set('Authorization', login.body.token)
    .send({ topic: 'Algebra', gradeLevel: 'Class 10' });
  expect(quiz.status).toBe(200);
});
```

API tested using Postman and automated Supertest.

## iii. System Testing

System testing validates the entire application as a whole:
- Functional testing of login, quiz generation, attendance, and error handling
- Performance testing under multiple simultaneous users
- Cross-browser UI consistency

Browsers Tested: Edge, Firefox, Chrome, Safari

## b. Test Reports Module

| Test ID | Module | Test Description | Expected Output | Actual Output | Status |
|--------|-------|-----------------|----------------|---------------|--------|
| TC001 | Authentication | Login with correct credentials | Redirect to Home | Redirect to Home | Pass |
| TC002 | Authentication | Login with wrong password | Error: Invalid credentials | Error: Invalid credentials | Pass |
| TC003 | Quiz | Generate valid quiz | Questions array returned | Questions array returned | Pass |
| TC004 | Quiz | Submit blank topic | Error: Topic required | Error: Topic required | Pass |
| TC005 | Attendance | Mark attendance with valid code | Status: present | Status: present | Pass |
| TC006 | Grades | View student grades | Grades displayed | Grades displayed | Pass |
| TC007 | Notes | Search notes | Search results | Search results | Pass |
| TC008 | UI | Load site on mobile | Responsive layout | Responsive layout | Pass |
| TC009 | Integration | Full flow (Login→Quiz→Submit→Grade) | Smooth navigation | All components work | Pass |
| TC010 | External API | Disconnect Gemini API | Graceful error message | Graceful error message | Pass |
| TC011 | Session | Session code generation | 6-digit code | 6-digit code | Pass |
| TC012 | Gamification | XP calculation | Correct XP awarded | Correct XP awarded | Pass |

================================================================================
9. DATABASE CONNECTION
================================================================================

// server/db/mongoAtlas.js
import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB = process.env.MONGODB_DB || 'gyandeep';

const POOL_CONFIG = {
  minPoolSize: 5,
  maxPoolSize: 50,
  connectTimeoutMS: 10000,
};

let cachedClient = null;
let cachedDb = null;

export async function connectToDatabase() {
  if (cachedDb) return cachedDb;
  
  if (!cachedClient) {
    cachedClient = new MongoClient(MONGODB_URI, POOL_CONFIG);
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

export async function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '') || req.cookies?.token;
  
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    req.userId = decoded.id;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

export default authMiddleware;

// server/routes/auth.js
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// API to register user
const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Missing Details' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const newUser = new userModel({ name, email, password: hashedPassword });
    const user = await newUser.save();
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
    
    res.json({ success: true, token, user: { name: user.name } });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// API to login user
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await userModel.findOne({ email });
    
    if (!user) {
      return res.status(401).json({ success: false, message: 'User does not exist' });
    }
    
    const isMatch = await bcrypt.compare(password, user.password);
    if (isMatch) {
      const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
      res.json({ success: true, token, user: { name: user.name } });
    } else {
      res.json({ success: false, message: 'Invalid credentials' });
    }
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// API to get user profile
const getUserProfile = async (req, res) => {
  try {
    const userId = req.userId;
    const user = await userModel.findById(userId);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    res.json({
      success: true,
      user: { name: user.name, email: user.email, role: user.role }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export { registerUser, loginUser, getUserProfile };

================================================================================
c. DATA STORE/RETRIEVES/UPDATE
================================================================================

// server/routes/notes.js (Prompt equivalent)
import { connectToDatabase, COLLECTIONS } from '../db/mongoAtlas.js';

const storeNote = async (req, res) => {
  const note = {
    userId: req.user.userId,
    title: req.body.title,
    content: req.body.content,
    createdAt: new Date(),
  };
  
  const savedNote = await db.collection(COLLECTIONS.NOTES).insertOne(note);
  res.status(201).json(savedNote);
};

// Retrieve all notes for a user
const getUserNotes = async (req, res) => {
  const notes = await db.collection(COLLECTIONS.NOTES)
    .find({ userId: req.user.userId })
    .toArray();
  res.json(notes);
};

================================================================================
d. DATA VALIDATION
================================================================================

// server/middleware/validate.js
import { body, validationResult } from 'express-validator';

exports.validateUserInput = [
  body('name').isLength({ min: 2 }).withMessage('Name required'),
  body('email').isEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 8 }).withMessage('Password min 8 chars'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

================================================================================
e. PROCEDURES/FUNCTIONS
================================================================================

// server/services/llmService.js
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function generateQuiz(topic, gradeLevel, numQuestions) {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  
  const prompt = `Generate ${numQuestions} questions for ${gradeLevel} on ${topic}`;
  const result = await model.generateContent(prompt);
  
  return JSON.parse(result.response.text());
}

module.exports = { generateQuiz };

// server/services/emailService.js
import Resend from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

async function sendWelcomeEmail(email, name) {
  return resend.emails.send({
    from: 'noreply@gyandeep.edu',
    to: email,
    subject: 'Welcome to Gyandeep!',
    html: `<h1>Welcome, ${name}!</h1>`,
  });
}

module.exports = { sendWelcomeEmail };

================================================================================
f. INTERFACING WITH EXTERNAL DEVICES/SERVICES
================================================================================

// server/routes/ai.js
const { generateQuiz } = require('../services/llmService');

const generateAndStoreQuiz = async (req, res) => {
  const { topic, gradeLevel } = req.body;
  const questions = await generateQuiz(topic, gradeLevel, 10);
  
  // Save to database or send to client
  res.json({ questions });
};

================================================================================
g. PASSING OF PARAMETERS
================================================================================

// Example of parameter passing in route
app.post('/api/quiz/generate', authMiddleware, validateQuizInput, generateQuiz);

// Parameters are passed:
// Through req.body (topic, gradeLevel)
// Through req.user.userId (from JWT)
// Through req.params.id (from URL)
// Middleware stack handles flow

================================================================================
h. BACKUP/RECOVERY
================================================================================

# Manual MongoDB Atlas Backup

# For local dev:
mongodump --uri="mongodb+srv://<username>:<password>@cluster.mongodb.net/gyandeep" --out=./backup

# Restore:
mongorestore --uri="mongodb+srv://<username>:<password>@cluster.mongodb.net/gyandeep" ./backup

# Automated via MongoDB Atlas: Settings → Backup → Configure automatic backups

================================================================================
i. INTERNAL DOCUMENTATION (EXAMPLES)
================================================================================

/**
 * connectToDatabase
 * Establishes connection to MongoDB Atlas.
 * @returns {Promise<Db>} Database instance
 */
export async function connectToDatabase() { }

/**
 * authMiddleware
 * JWT authentication middleware.
 * @param {Request} req - Express request
 * @param {Response} res - Express response  
 * @param {Function} next - Express next
 */
export async function authMiddleware(req, res, next) { }

/**
 * generateQuiz
 * Generates quiz via Gemini AI.
 * @param {string} topic - Subject/topic
 * @param {string} gradeLevel - Grade
 * @returns {Promise<Array>} Questions array
 */
export async function generateQuiz(topic, gradeLevel) { }