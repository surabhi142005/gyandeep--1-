/**
 * server/routes/google.js
 * Google OAuth integration
 */

import express from 'express';
const router = express.Router();
import { ObjectId } from 'mongodb';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { connectToDatabase, COLLECTIONS } from '../db/mongoAtlas.js';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const JWT_SECRET = process.env.JWT_SECRET || 'gyandeep-secret-key';
const FRONTEND_URL = process.env.VITE_APP_URL || (process.env.NODE_ENV === 'production' ? 'https://gyandeep.edu' : 'http://localhost:5173');
const API_URL = process.env.API_URL || (process.env.NODE_ENV === 'production' ? 'https://api.gyandeep.edu' : 'http://localhost:3001');

function generateTokenPair(user) {
  const accessToken = jwt.sign(
    { id: user._id?.toString() || user.id, email: user.email, role: user.role, name: user.name },
    JWT_SECRET,
    { expiresIn: '15m' }
  );
  const refreshToken = jwt.sign(
    { id: user._id?.toString() || user.id, type: 'refresh' },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
  return { accessToken, refreshToken };
}

router.get('/auth/google', (req, res) => {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    return res.status(501).json({ 
      error: 'Google OAuth not configured',
      message: 'Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables'
    });
  }

  const state = Math.random().toString(36).substring(7);
  const scope = encodeURIComponent('email profile');
  const origin = API_URL || `${req.protocol}://${req.get('host')}`;
  const redirectUri = `${origin}/api/google/callback`;
  
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${GOOGLE_CLIENT_ID}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `response_type=code&` +
    `scope=${scope}&` +
    `state=${state}&` +
    `access_type=offline&` +
    `prompt=consent`;

  res.json({ authUrl, state });
});

router.post('/callback', async (req, res) => {
  try {
    const { code, state } = req.body;
    
    if (!code) {
      return res.status(400).json({ error: 'Authorization code required' });
    }

    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      return res.status(501).json({ error: 'Google OAuth not configured' });
    }

    const origin = API_URL || `${req.protocol}://${req.get('host')}`;
    const redirectUri = `${origin}/api/google/callback`;

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.json();
      throw new Error(error.error_description || 'Token exchange failed');
    }

    const tokens = await tokenResponse.json();

    const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    if (!userResponse.ok) {
      throw new Error('Failed to get user info from Google');
    }

    const googleUser = await userResponse.json();

    const db = await connectToDatabase();
    let user = await db.collection(COLLECTIONS.USERS).findOne({ 
      $or: [
        { email: googleUser.email },
        { googleId: googleUser.id }
      ]
    });

    if (!user) {
      const result = await db.collection(COLLECTIONS.USERS).insertOne({
        name: googleUser.name || googleUser.email.split('@')[0],
        email: googleUser.email,
        googleId: googleUser.id,
        googlePicture: googleUser.picture,
        role: 'student',
        active: true,
        emailVerified: true,
        preferences: {},
        history: [],
        assignedSubjects: [],
        performance: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      user = { _id: result.insertedId, ...googleUser, role: 'student' };
    } else {
      if (user.googleId !== googleUser.id) {
        await db.collection(COLLECTIONS.USERS).updateOne(
          { _id: user._id },
          { $set: { 
            googleId: googleUser.id, 
            googlePicture: googleUser.picture,
            updatedAt: new Date() 
          }}
        );
      }
    }

    const authTokens = generateTokenPair(user);

    res.json({
      ...authTokens,
      user: {
        id: user._id?.toString() || user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        googlePicture: user.googlePicture,
      },
    });
  } catch (error) {
    console.error('Google OAuth callback error:', error);
    res.status(500).json({ error: 'OAuth authentication failed' });
  }
});

router.post('/link', async (req, res) => {
  try {
    const { code, userId } = req.body;
    
    if (!code || !userId) {
      return res.status(400).json({ error: 'Code and userId required' });
    }

    const origin = API_URL || `${req.protocol}://${req.get('host')}`;
    const redirectUri = `${origin}/api/google/callback`;

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error('Token exchange failed');
    }

    const tokens = await tokenResponse.json();
    const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    const googleUser = await userResponse.json();

    const db = await connectToDatabase();
    await db.collection(COLLECTIONS.USERS).updateOne(
      { _id: new ObjectId(userId) },
      { $set: { 
        googleId: googleUser.id,
        googlePicture: googleUser.picture,
        updatedAt: new Date()
      }}
    );

    res.json({ ok: true, message: 'Google account linked successfully' });
  } catch (error) {
    console.error('Google link error:', error);
    res.status(500).json({ error: 'Failed to link Google account' });
  }
});

router.post('/unlink', async (req, res) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID required' });
    }

    const db = await connectToDatabase();
    await db.collection(COLLECTIONS.USERS).updateOne(
      { _id: new ObjectId(userId) },
      { $unset: { googleId: '', googlePicture: '' }, $set: { updatedAt: new Date() } }
    );

    res.json({ ok: true, message: 'Google account unlinked' });
  } catch (error) {
    console.error('Google unlink error:', error);
    res.status(500).json({ error: 'Failed to unlink Google account' });
  }
});

router.get('/status', (req, res) => {
  res.json({
    configured: !!(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET),
    provider: 'google',
    message: GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET 
      ? 'Google OAuth is configured' 
      : 'Google OAuth is not configured',
  });
});

export default router;
