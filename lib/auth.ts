/**
 * lib/auth.ts
 * JWT Authentication & RBAC middleware for serverless
 */

import jwt from 'jsonwebtoken';
import type { NextRequest } from 'next/server';

const JWT_SECRET = process.env.JWT_SECRET || '';
const JWT_EXPIRES_IN = '7d';

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

/**
 * Sign a JWT token
 */
export function signToken(user: { id: string; email: string; role: string; name?: string }): string {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

/**
 * Verify a JWT token
 */
export function verifyToken(token: string): AuthUser {
  return jwt.verify(token, JWT_SECRET) as AuthUser;
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

export function badRequest(message: string = 'Bad request') {
  return new Response(JSON.stringify({ error: message }), {
    status: 400,
    headers: { 'Content-Type': 'application/json' }
  });
}

export function json(data: any, status: number = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

export function success(data: any = { ok: true }) {
  return json(data, 200);
}

/**
 * Hash password (bcrypt alternative for simple use)
 * In production, use bcrypt
 */
export function hashPassword(password: string): string {
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(password).digest('hex');
}

export default {
  signToken,
  verifyToken,
  extractToken,
  getUserFromRequest,
  requireAuth,
  requireRole,
  requireTeacher,
  requireAdmin,
  unauthorized,
  forbidden,
  notFound,
  badRequest,
  json,
  success,
};
