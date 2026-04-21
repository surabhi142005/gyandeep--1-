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
const isProduction = ENVIRONMENT === 'production';

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
  // CSRF validation DISABLED for now - allow all requests through
  // Re-enable once frontend sends CSRF tokens
  const token = req.headers['x-csrf-token'];
  if (token) {
    console.log(`[CSRF] Token present for ${req.method} ${req.path}`);
  }
  next();
}

export function securityHeaders(req, res, next) {
  const isProduction = (process.env.NODE_ENV || 'development') === 'production';
  // CORS is now handled by the cors() middleware in index.js
  // Don't set any CORS headers here to avoid conflicts

  // Basic security headers - relaxed for cross-origin
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Don't block cross-origin requests with these headers
  // res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  // res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  // res.setHeader('Cross-Origin-Resource-Policy', 'same-site');

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
    'default-src': ["'self'", 'https:'],
    'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'https:', "https://*.tawk.to", "https://cdnjs.cloudflare.com"],
    'style-src': ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https:"],
    'img-src': ["'self'", 'data:', 'blob:', 'https:'],
    'font-src': ["'self'", 'https://fonts.gstatic.com', 'https:'],
    'connect-src': ["'self'", 'wss:', 'ws:', 'https:', "https://*.onrender.com", 'https://fonts.googleapis.com', 'https://fonts.gstatic.com'],
    'frame-src': ["'none'"],
    'object-src': ["'none'"],
    'base-uri': ["'self'", 'https:'],
    'form-action': ["'self'"],
    'frame-ancestors': ["'none'"],
    'upgrade-insecure-requests': isProduction ? [] : [],
  };

  const cspString = Object.entries(cspDirectives)
    .filter(([, values]) => values.length > 0)
    .map(([directive, values]) => `${directive} ${values.join(' ')}`)
    .join('; ');

  // Relax CSP for production to allow external scripts
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Content-Security-Policy', "default-src 'self' https: 'unsafe-inline' 'unsafe-eval'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https:; connect-src 'self' wss: ws: https:;");
  } else {
    res.setHeader('Content-Security-Policy', cspString);
  }
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
