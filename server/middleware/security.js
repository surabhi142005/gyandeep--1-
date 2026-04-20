/**
 * server/middleware/security.js
 * Enhanced security middleware with comprehensive headers and sanitization
 */

import crypto from 'crypto';
import DOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

const window = new JSDOM('').window;
const purify = DOMPurify(window);

const CSRF_SECRET = process.env.CSRF_SECRET || process.env.SESSION_SECRET || 'default-csrf-secret-change-me';
const ENVIRONMENT = process.env.NODE_ENV || 'development';

export function generateCSRFToken() {
  return crypto.randomBytes(32).toString('hex');
}

export function createCSRFTokenPair() {
  const token = generateCSRFToken();
  const signature = crypto
    .createHmac('sha256', CSRF_SECRET)
    .update(token)
    .digest('hex');
  return { token, signature };
}

export function verifyCSRFToken(token, signature) {
  if (!token || !signature) return false;
  
  const expectedSignature = crypto
    .createHmac('sha256', CSRF_SECRET)
    .update(token)
    .digest('hex');
  
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  } catch {
    return false;
  }
}

export function csrfProtection(req, res, next) {
  // Skip CSRF for safe methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  const token = req.headers['x-csrf-token'];
  const signature = req.headers['x-csrf-signature'];
  const ENVIRONMENT = process.env.NODE_ENV || 'development';
  
// Make CSRF optional for initial login/register to prevent lockouts
  const isAuthRoute = req.path.includes('/api/auth/login') || 
                       req.path.includes('/api/auth/register') ||
                       req.path.includes('/api/auth/csrf-token') ||
                       req.path.includes('/api/chat') ||
                       req.path.includes('/api/quiz');

  if (!token) {
    if (isAuthRoute) {
      console.warn(`[CSRF] Missing token for auth route ${req.path} (allowed)`);
      return next();
    }
    console.warn(`[CSRF] Missing token for ${req.method} ${req.path}`);
    return res.status(403).json({ 
      error: 'CSRF validation failed',
      message: 'Missing required CSRF token'
    });
  }

  // Verify signature - required in production, optional for backward compatibility in dev
  if (!signature || !verifyCSRFToken(token, signature)) {
    if (isAuthRoute) {
      console.warn(`[CSRF] Invalid signature for auth route ${req.path} (allowed)`);
      return next();
    }
    
    console.warn(`[CSRF] Invalid signature for ${req.method} ${req.path}. Signature present: ${!!signature}`);
    if (ENVIRONMENT === 'production' || process.env.VERCEL) {
      return res.status(403).json({ 
        error: 'CSRF validation failed',
        message: 'Invalid security signature'
      });
    }
    // In development, just log but allow through for easier testing
    console.warn('[CSRF] Signature verification failed (allowed in non-production)');
  }

  next();
}

export function securityHeaders(req, res, next) {
  const isProduction = ENVIRONMENT === 'production';
  const origin = req.headers.origin;
  const allowedOriginsRaw = process.env.ALLOWED_ORIGINS?.split(',').map(o => o.trim()) || [];
  if (process.env.ALLOWED_ORIGIN) allowedOriginsRaw.push(process.env.ALLOWED_ORIGIN);
  if (process.env.FRONTEND_URL) allowedOriginsRaw.push(process.env.FRONTEND_URL);
  
  const allowedOrigins = allowedOriginsRaw.map(o => o.replace(/\/$/, '').toLowerCase());
  const normalizedOrigin = origin?.replace(/\/$/, '').toLowerCase();

  // If origin is allowed, set the header (though cors middleware also does this)
  if (normalizedOrigin && (
      allowedOrigins.includes(normalizedOrigin) || 
      normalizedOrigin.endsWith('.vercel.app') ||
      (process.env.VERCEL && normalizedOrigin.includes('vercel.app'))
  )) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }

  // Basic security headers
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Download-Options', 'noopen');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-site');

  if (isProduction) {
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Strict-Transport-Security', [
      'max-age=31536000',
      'includeSubDomains',
      'preload'
    ].join('; '));
  } else {
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Strict-Transport-Security', 'max-age=0');
  }

  const cspDirectives = {
    'default-src': ["'self'"],
    'script-src': ["'self'"],
    'style-src': ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
    'img-src': ["'self'", 'data:', 'blob:', 'https:'],
    'font-src': ["'self'", 'https://fonts.gstatic.com'],
    'connect-src': ["'self'", 'wss:', 'https://fonts.googleapis.com', 'https://fonts.gstatic.com'],
    'frame-src': ["'none'"],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'none'"],
    'upgrade-insecure-requests': isProduction ? [] : [],
  };

  const cspString = Object.entries(cspDirectives)
    .filter(([, values]) => values.length > 0)
    .map(([directive, values]) => `${directive} ${values.join(' ')}`)
    .join('; ');

  res.setHeader('Content-Security-Policy', cspString);
  res.setHeader('X-Content-Security-Policy', cspString);

  res.removeHeader('X-Powered-By');
  res.removeHeader('Server');

  next();
}

export function sanitizeInput(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObjectRecursive(req.body);
  }
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeObjectRecursive(req.query);
  }
  if (req.params && typeof req.params === 'object') {
    req.params = sanitizeObjectRecursive(req.params);
  }
  next();
}

function sanitizeObjectRecursive(obj, depth = 0) {
  if (depth > 10) return obj;
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObjectRecursive(item, depth + 1));
  }
  
  if (obj && typeof obj === 'object') {
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeObjectRecursive(value, depth + 1);
    }
    return sanitized;
  }
  
  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }
  
  return obj;
}

function sanitizeString(str) {
  let sanitized = str;

  sanitized = purify.sanitize(str, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  });

  sanitized = sanitized
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
    .replace(/data:/gi, '')
    .replace(/vbscript:/gi, '')
    .replace(/expression\s*\(/gi, '')
    .replace(/url\s*\(/gi, '')
    .replace(/<iframe/gi, '&lt;iframe')
    .replace(/<object/gi, '&lt;object')
    .replace(/<embed/gi, '&lt;embed')
    .replace(/<link/gi, '&lt;link')
    .replace(/<meta/gi, '&lt;meta')
    .trim();

  return sanitized.slice(0, 100000);
}

export function sanitizeHTML(html) {
  return purify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: ['href', 'target'],
    ALLOW_DATA_ATTR: false,
  });
}

const MAX_BODY_SIZE = process.env.MAX_BODY_SIZE || '10mb';
const MAX_FILE_SIZE = process.env.MAX_FILE_SIZE || '5mb';

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

export function fileUploadLimit(req, res, next) {
  const contentLength = parseInt(req.headers['content-length'] || '0', 10);
  const maxBytes = parseInt(MAX_FILE_SIZE, 10) * 1024 * 1024;
  
  if (contentLength > maxBytes) {
    return res.status(413).json({ 
      error: 'File too large',
      message: `File size exceeds maximum of ${MAX_FILE_SIZE}`
    });
  }
  next();
}

export function noSniff(req, res, next) {
  const path = req.path.toLowerCase();
  
  if (path.endsWith('.js')) {
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  } else if (path.endsWith('.css')) {
    res.setHeader('Content-Type', 'text/css; charset=utf-8');
  } else if (path.endsWith('.json')) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
  }
  
  res.setHeader('X-Content-Type-Options', 'nosniff');
  next();
}

export function preventClickjacking(req, res, next) {
  res.removeHeader('X-Frame-Options');
  res.setHeader('X-Frame-Options', 'DENY');
  next();
}
