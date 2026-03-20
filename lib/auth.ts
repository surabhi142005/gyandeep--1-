/**
 * lib/auth.ts
 * JWT Authentication & RBAC middleware for serverless
 * Now includes token refresh and secure password handling
 */

import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import type { NextRequest } from 'next/server';

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET + '_refresh';
const JWT_EXPIRES_IN = '15m';
const JWT_REFRESH_EXPIRES_IN = '7d';

if (!JWT_SECRET) {
  console.warn('WARNING: JWT_SECRET environment variable is not set. Using insecure default for development only.');
}

const SECURE_JWT_SECRET = JWT_SECRET || 'INSECURE_DEV_ONLY_DO_NOT_USE_IN_PRODUCTION';

export interface JWTPayload {
  id: string;
  email: string;
  role: 'student' | 'teacher' | 'admin';
  name?: string;
}

export interface AuthUser extends JWTPayload {
  iat?: number;
  exp?: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

/**
 * Sign an access token (short-lived)
 */
export function signToken(user: { id: string; email: string; role: string; name?: string }): string {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    SECURE_JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

/**
 * Sign a refresh token (long-lived)
 */
export function signRefreshToken(userId: string): string {
  return jwt.sign(
    { id: userId, type: 'refresh' },
    JWT_REFRESH_SECRET,
    { expiresIn: JWT_REFRESH_EXPIRES_IN }
  );
}

/**
 * Generate both access and refresh tokens
 */
export function generateTokenPair(user: { id: string; email: string; role: string; name?: string }): TokenPair {
  return {
    accessToken: signToken(user),
    refreshToken: signRefreshToken(user.id),
  };
}

/**
 * Refresh tokens using refresh token
 */
export function refreshTokens(refreshToken: string): TokenPair | null {
  try {
    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as { id: string; type: string };
    
    if (decoded.type !== 'refresh') {
      return null;
    }

    return {
      accessToken: signToken({ id: decoded.id, email: '', role: 'student' }),
      refreshToken: signRefreshToken(decoded.id),
    };
  } catch {
    return null;
  }
}

/**
 * Verify a JWT token
 */
export function verifyToken(token: string): AuthUser {
  return jwt.verify(token, SECURE_JWT_SECRET) as AuthUser;
}

/**
 * Extract token from Authorization header
 */
export function extractToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return null;
  
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  return null;
}

/**
 * Get user from request
 */
export function getUserFromRequest(request: NextRequest): AuthUser | null {
  const token = extractToken(request);
  if (!token) return null;
  
  try {
    return verifyToken(token);
  } catch {
    return null;
  }
}

/**
 * Require authentication - returns user or null
 */
export function requireAuth(request: NextRequest): AuthUser | null {
  const user = getUserFromRequest(request);
  if (!user) return null;
  return user;
}

/**
 * Require specific role(s)
 */
export function requireRole(request: NextRequest, roles: string | string[]): AuthUser | null {
  const user = getUserFromRequest(request);
  if (!user) return null;
  
  const allowedRoles = Array.isArray(roles) ? roles : [roles];
  if (!allowedRoles.includes(user.role)) return null;
  
  return user;
}

/**
 * Require teacher or admin
 */
export function requireTeacher(request: NextRequest): AuthUser | null {
  return requireRole(request, ['teacher', 'admin']);
}

/**
 * Require admin only
 */
export function requireAdmin(request: NextRequest): AuthUser | null {
  return requireRole(request, 'admin');
}

/**
 * Hash password using bcrypt (secure)
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

/**
 * Verify password using bcrypt (secure)
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Validate password strength
 */
export function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  return { valid: errors.length === 0, errors };
}

/**
 * Sanitize input string
 */
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') return '';
  return input
    .trim()
    .replace(/[<>]/g, '')
    .slice(0, 10000);
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
}

/**
 * API Response helpers
 */
export function unauthorized(message: string = 'Unauthorized') {
  return new Response(JSON.stringify({ error: message }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' }
  });
}

export function forbidden(message: string = 'Forbidden') {
  return new Response(JSON.stringify({ error: message }), {
    status: 403,
    headers: { 'Content-Type': 'application/json' }
  });
}

export function notFound(message: string = 'Not found') {
  return new Response(JSON.stringify({ error: message }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' }
  });
}

export function badRequest(message: string = 'Bad request', details?: any) {
  return new Response(JSON.stringify({ error: message, details }), {
    status: 400,
    headers: { 'Content-Type': 'application/json' }
  });
}

export function tooManyRequests(message: string = 'Too many requests') {
  return new Response(JSON.stringify({ error: message }), {
    status: 429,
    headers: { 'Content-Type': 'application/json' }
  });
}

export function json(data: any, status: number = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 
      'Content-Type': 'application/json',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
    }
  });
}

export function success(data: any = { ok: true }) {
  return json(data, 200);
}

export default {
  signToken,
  signRefreshToken,
  generateTokenPair,
  refreshTokens,
  verifyToken,
  extractToken,
  getUserFromRequest,
  requireAuth,
  requireRole,
  requireTeacher,
  requireAdmin,
  hashPassword,
  verifyPassword,
  validatePassword,
  sanitizeString,
  isValidEmail,
  unauthorized,
  forbidden,
  notFound,
  badRequest,
  tooManyRequests,
  json,
  success,
};
