/**
 * server/middleware/security.js
 * Security middleware for Express server
 */

import crypto from 'crypto';

export function generateCSRFToken() {
  return crypto.randomBytes(32).toString('hex');
}

export function verifyCSRFToken(token, secret) {
  if (!token || !secret) return false;
  const expected = crypto.createHash('sha256').update(secret).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected));
}

export function csrfProtection(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  const token = req.headers['x-csrf-token'];
  const sessionSecret = req.headers['x-session-secret'];

  if (!token || !sessionSecret) {
    return res.status(403).json({ 
      error: 'CSRF validation failed',
      message: 'Missing required security headers'
    });
  }

  if (!verifyCSRFToken(token, sessionSecret)) {
    return res.status(403).json({ 
      error: 'CSRF validation failed',
      message: 'Invalid security token'
    });
  }

  next();
}

export function securityHeaders(req, res, next) {
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Download-Options', 'noopen');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  
  res.setHeader('Content-Security-Policy', [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "frame-ancestors 'none'",
  ].join('; '));

  next();
}

export function sanitizeInput(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeObject(req.query);
  }
  next();
}

function sanitizeObject(obj) {
  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = value
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+=/gi, '')
        .trim();
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map(v => typeof v === 'string' ? v.slice(0, 10000) : v);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

const MAX_BODY_SIZE = '10mb';
export function requestSizeLimit(req, res, next) {
  const contentLength = parseInt(req.headers['content-length'] || '0', 10);
  const maxBytes = parseInt(MAX_BODY_SIZE, 10) * 1024 * 1024;
  
  if (contentLength > maxBytes) {
    return res.status(413).json({ 
      error: 'Payload too large',
      message: `Request body exceeds maximum size of ${MAX_BODY_SIZE}`
    });
  }
  next();
}
