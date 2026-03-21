/**
 * server/middleware/auth.js
 * Authentication middleware with httpOnly cookie support
 */

import jwt from 'jsonwebtoken';
import { connectToDatabase, COLLECTIONS } from '../db/mongoAtlas.js';

const JWT_SECRET = process.env.JWT_SECRET || 'gyandeep-secret-key';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET + '_refresh';

export const TOKEN_COOKIE_NAME = 'gyandeep_token';
export const REFRESH_COOKIE_NAME = 'gyandeep_refresh_token';

export const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
};

export const REFRESH_COOKIE_OPTIONS = {
  ...COOKIE_OPTIONS,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

export function extractToken(req) {
  // Check for Bearer token first (backward compatibility)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  // Check httpOnly cookie
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

  res.cookie(REFRESH_COOKIE_NAME, refreshToken, REFRESH_COOKIE_OPTIONS);
}

export function clearAuthCookies(res) {
  res.clearCookie(TOKEN_COOKIE_NAME, COOKIE_OPTIONS);
  res.clearCookie(REFRESH_COOKIE_NAME, REFRESH_COOKIE_OPTIONS);
}

export async function getUserFromToken(token) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const db = await connectToDatabase();
    const user = await db.collection(COLLECTIONS.USERS).findOne(
      { _id: new (require('mongodb').ObjectId)(decoded.id) },
      { projection: { password: 0 } }
    );
    return user;
  } catch {
    return null;
  }
}
