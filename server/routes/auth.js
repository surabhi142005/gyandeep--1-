/**
 * server/routes/auth.js
 * Authentication routes with httpOnly cookie support
 */

import express from 'express';
const router = express.Router();
import cookieParser from 'cookie-parser';
import { ObjectId } from 'mongodb';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { connectToDatabase, COLLECTIONS } from '../db/mongoAtlas.js';
import {
  sendWelcomeEmail
} from '../services/emailService.js';

import { setAuthCookies, clearAuthCookies } from '../middleware/auth.js';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || (JWT_SECRET ? JWT_SECRET + '_refresh' : undefined);
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

function signAccessToken(user) {
  return jwt.sign(
    { id: user._id?.toString() || user.id, email: user.email, role: user.role, name: user.name },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

function signRefreshToken(userId) {
  return jwt.sign(
    { id: userId, type: 'refresh', iat: Date.now() },
    JWT_REFRESH_SECRET,
    { expiresIn: JWT_REFRESH_EXPIRES_IN }
  );
}

function generateTokenPair(user) {
  return {
    accessToken: signAccessToken(user),
    refreshToken: signRefreshToken(user._id?.toString() || user.id),
  };
}

function validatePassword(password) {
  const errors = [];
  if (password.length < 8) errors.push('at least 8 characters');
  if (!/[A-Z]/.test(password)) errors.push('one uppercase letter');
  if (!/[a-z]/.test(password)) errors.push('one lowercase letter');
  if (!/[0-9]/.test(password)) errors.push('one number');
  return { valid: errors.length === 0, errors };
}

function sanitize(input) {
  if (typeof input !== 'string') return '';
  return input.trim().slice(0, 10000);
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

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
      { _id: new ObjectId(decoded.id) },
      { projection: { password: 0 } }
    );

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    if (!user.active) {
      return res.status(403).json({ error: 'Account is deactivated' });
    }

    const tokens = generateTokenPair(user);
    setAuthCookies(res, tokens.accessToken, tokens.refreshToken);

    res.json({
      ...tokens,
      user: { id: user._id?.toString(), name: user.name, email: user.email, role: user.role },
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(401).json({ error: 'Invalid or expired refresh token' });
  }
});

function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

router.post('/login', async (req, res) => {
  try {
    const email = sanitize(req.body.email);
    const password = req.body.password;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
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

    const safeUser = {
      id: user._id?.toString() || user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      faceImage: user.faceImage,
      classId: user.classId,
      assignedSubjects: user.assignedSubjects,
    };

    // Also return tokens in body for clients that prefer it
    res.json({
      ...tokens,
      user: safeUser,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

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

    const passwordCheck = validatePassword(password);
    if (!passwordCheck.valid) {
      return res.status(400).json({
        error: 'Password does not meet requirements',
        details: passwordCheck.errors
      });
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
      active: true,
      emailVerified: false,
      preferences: {},
      history: [],
      assignedSubjects: [],
      performance: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const user = { _id: result.insertedId, email, role, name };
    const tokens = generateTokenPair(user);
    setAuthCookies(res, tokens.accessToken, tokens.refreshToken);

    // Send welcome email (non-blocking)
    sendWelcomeEmail(email, name, role).catch(err => {
      console.error('Failed to send welcome email:', err.message);
    });

    res.status(201).json({
      ...tokens,
      user: {
        id: result.insertedId.toString(),
        name,
        email,
        role,
      },
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/logout', async (req, res) => {
  clearAuthCookies(res);
  res.json({ ok: true, message: 'Logged out successfully' });
});

router.post('/login-face', async (req, res) => {
  try {
    const { userId, faceImage } = req.body;
    
    if (!userId || !faceImage) {
      return res.status(400).json({ error: 'userId and faceImage are required' });
    }

    const db = await connectToDatabase();
    const user = await db.collection(COLLECTIONS.USERS).findOne(
      { _id: new ObjectId(userId) },
      { projection: { password: 0 } }
    );

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    if (!user.active) {
      return res.status(403).json({ error: 'Account is deactivated' });
    }

    const faceRecord = await db.collection(COLLECTIONS.FACE_EMBEDDINGS).findOne({ userId });
    if (!faceRecord) {
      return res.status(401).json({ error: 'Face not registered. Please register your face first.' });
    }

    const { verifyFaceForAuth } = await import('../routes/face.js');
    const verifyResult = await verifyFaceForAuth(userId, faceImage);
    
    if (!verifyResult.authenticated) {
      return res.status(401).json({ 
        error: 'Face not matched', 
        details: verifyResult.error || 'Please try again'
      });
    }

    const tokens = generateTokenPair(user);
    setAuthCookies(res, tokens.accessToken, tokens.refreshToken);

    const safeUser = {
      id: user._id?.toString() || user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      faceImage: user.faceImage,
      classId: user.classId,
      assignedSubjects: user.assignedSubjects,
    };

    res.json({
      ...tokens,
      user: safeUser,
    });
  } catch (error) {
    console.error('Face login error:', error);
    res.status(500).json({ error: 'Face login failed' });
  }
});

router.post('/password/request', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const db = await connectToDatabase();
    const user = await db.collection(COLLECTIONS.USERS).findOne({ email });
    
    // Always return success to prevent email enumeration
    if (!user) {
      return res.json({ ok: true, message: 'If the email exists, a reset code has been sent' });
    }

    const code = generateCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await db.collection(COLLECTIONS.PASSWORD_RESETS).insertOne({
      email,
      code,
      expiresAt,
      used: false,
      createdAt: new Date(),
    });

    // Send actual email with verification code
    try {
      await sendVerificationCode(email, code, 'password-reset');
    } catch (emailError) {
      console.error('[Auth] Password reset email send failed:', emailError.message);
    }

    res.json({ ok: true, message: 'If the email exists, a reset code has been sent' });
  } catch (error) {
    console.error('Password request error:', error);
    res.status(500).json({ error: 'Failed to process request' });
  }
});

router.post('/password/verify', async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ error: 'Email and code are required' });
    }

    const db = await connectToDatabase();
    const reset = await db.collection(COLLECTIONS.PASSWORD_RESETS).findOne({
      email,
      code,
      used: false,
      expiresAt: { $gt: new Date() },
    });

    if (!reset) {
      return res.status(400).json({ error: 'Invalid or expired code' });
    }

    res.json({ ok: true, valid: true });
  } catch (error) {
    console.error('Password verify error:', error);
    res.status(500).json({ error: 'Failed to verify code' });
  }
});

router.post('/password/complete', async (req, res) => {
  try {
    const email = sanitize(req.body.email);
    const code = sanitize(req.body.code);
    const newPassword = req.body.newPassword;

    if (!email || !code || !newPassword) {
      return res.status(400).json({ error: 'Email, code, and newPassword are required' });
    }

    const passwordCheck = validatePassword(newPassword);
    if (!passwordCheck.valid) {
      return res.status(400).json({
        error: 'Password does not meet requirements',
        details: passwordCheck.errors
      });
    }

    const db = await connectToDatabase();
    const reset = await db.collection(COLLECTIONS.PASSWORD_RESETS).findOne({
      email,
      code,
      used: false,
      expiresAt: { $gt: new Date() },
    });

    if (!reset) {
      return res.status(400).json({ error: 'Invalid or expired code' });
    }

    await db.collection(COLLECTIONS.PASSWORD_RESETS).updateOne(
      { _id: reset._id },
      { $set: { used: true, usedAt: new Date() } }
    );

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await db.collection(COLLECTIONS.USERS).updateOne(
      { email },
      { $set: { password: hashedPassword, updatedAt: new Date() } }
    );

    res.json({ ok: true, message: 'Password has been reset' });
  } catch (error) {
    console.error('Password complete error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

router.post('/email/verify-send', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const db = await connectToDatabase();
    
    // Check if email already verified
    const existingUser = await db.collection(COLLECTIONS.USERS).findOne({ email });
    if (existingUser?.emailVerified) {
      return res.status(400).json({ error: 'Email already verified' });
    }

    const code = generateCode();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    // Delete any existing pending verifications
    await db.collection(COLLECTIONS.EMAIL_VERIFICATIONS).deleteMany({ email });

    await db.collection(COLLECTIONS.EMAIL_VERIFICATIONS).insertOne({
      email,
      code,
      expiresAt,
      verified: false,
      createdAt: new Date(),
    });

    // Send actual email with verification code
    try {
      await sendVerificationCode(email, code, 'verification');
    } catch (emailError) {
      console.error('[Auth] Email verification send failed:', emailError.message);
    }

    res.json({ ok: true, message: 'Verification code sent' });
  } catch (error) {
    console.error('Email verify send error:', error);
    res.status(500).json({ error: 'Failed to send verification' });
  }
});

router.post('/email/verify-check', async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ error: 'Email and code are required' });
    }

    const db = await connectToDatabase();
    const verification = await db.collection(COLLECTIONS.EMAIL_VERIFICATIONS).findOne({
      email,
      code,
      verified: false,
      expiresAt: { $gt: new Date() },
    });

    if (!verification) {
      return res.status(400).json({ error: 'Invalid or expired code' });
    }

    await db.collection(COLLECTIONS.EMAIL_VERIFICATIONS).updateOne(
      { _id: verification._id },
      { $set: { verified: true, verifiedAt: new Date() } }
    );

    await db.collection(COLLECTIONS.USERS).updateOne(
      { email },
      { $set: { emailVerified: true, updatedAt: new Date() } }
    );

    res.json({ ok: true, verified: true });
  } catch (error) {
    console.error('Email verify check error:', error);
    res.status(500).json({ error: 'Failed to verify' });
  }
});

router.get('/me', async (req, res) => {
  try {
    const token = req.cookies?.[TOKEN_COOKIE_NAME] || req.headers.authorization?.slice(7);

    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const db = await connectToDatabase();
    const user = await db.collection(COLLECTIONS.USERS).findOne(
      { _id: new ObjectId(decoded.id) },
      { projection: { password: 0 } }
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ ...user, id: user._id.toString() });
  } catch (error) {
    console.error('Auth me error:', error);
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
    }
    res.status(401).json({ error: 'Invalid token' });
  }
});

router.get('/csrf-token', (req, res) => {
  const token = jwt.sign({ timestamp: Date.now() }, JWT_SECRET, { expiresIn: '1h' });
  res.json({ token });
});

router.get('/email-config', async (req, res) => {
  try {
    const config = await testEmailConfiguration();
    res.json(config);
  } catch (error) {
    console.error('Email config error:', error);
    res.status(500).json({ error: 'Failed to check email configuration' });
  }
});

router.get('/socket-token', async (req, res) => {
  try {
    const token = req.cookies?.[TOKEN_COOKIE_NAME] || req.headers.authorization?.slice(7);
    
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const decoded = jwt.verify(token, JWT_SECRET);
    
    const socketToken = jwt.sign(
      { id: decoded.id, email: decoded.email, role: decoded.role },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
    
    res.json({ token: socketToken });
  } catch (error) {
    console.error('Socket token error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
});

export default router;
