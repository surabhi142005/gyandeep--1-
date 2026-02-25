/**
 * server/middleware/validate.js — Input sanitization helpers
 *
 * Lightweight wrappers that strip dangerous characters and enforce
 * basic type/length constraints without a heavy validation library.
 *
 * Usage:
 *   import { requireFields, sanitizeString } from '../middleware/validate.js'
 *   const { email, password } = requireFields(req.body, ['email', 'password'])
 */

/**
 * Assert that all required fields are present and non-empty in an object.
 * Throws a validation error (caught by route wrapper) if any field is missing.
 *
 * @param {object} obj
 * @param {string[]} fields
 * @returns {object} the same object (for destructuring convenience)
 */
export function requireFields(obj, fields) {
  for (const f of fields) {
    if (obj[f] === undefined || obj[f] === null || String(obj[f]).trim() === '') {
      const err = new Error(`Missing required field: ${f}`)
      err.status = 400
      throw err
    }
  }
  return obj
}

/**
 * Strip HTML tags and trim whitespace from a string value.
 * Does NOT escape — use a proper sanitizer (DOMPurify/sanitize-html) for HTML output.
 */
export function sanitizeString(value, maxLen = 2000) {
  if (typeof value !== 'string') return ''
  return value
    .replace(/<[^>]*>/g, '')   // strip HTML tags
    .replace(/[<>]/g, '')      // strip remaining angle brackets
    .trim()
    .slice(0, maxLen)
}

/**
 * Sanitize an email address (lowercase, trim, strip non-email chars).
 */
export function sanitizeEmail(value) {
  if (typeof value !== 'string') return ''
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9@.+\-_]/g, '')
    .slice(0, 254)
}

/**
 * Middleware: attaches sanitised versions of common fields to req.sanitized.
 * Handles email, password (untouched), name, userId, classId, subjectId.
 */
export function sanitizeBody(req, _res, next) {
  const b = req.body || {}
  req.sanitized = {
    email:     b.email     ? sanitizeEmail(b.email)              : undefined,
    name:      b.name      ? sanitizeString(b.name, 100)         : undefined,
    userId:    b.userId    ? sanitizeString(b.userId, 50)        : undefined,
    classId:   b.classId   ? sanitizeString(b.classId, 50)       : undefined,
    subjectId: b.subjectId ? sanitizeString(b.subjectId, 50)     : undefined,
    password:  b.password  ? b.password                          : undefined, // never strip passwords
    subject:   b.subject   ? sanitizeString(b.subject, 100)      : undefined,
    text:      b.text      ? sanitizeString(b.text, 50000)       : undefined,
    notesText: b.notesText ? sanitizeString(b.notesText, 50000)  : undefined,
    content:   b.content   ? sanitizeString(b.content, 50000)    : undefined,
  }
  return next()
}

/**
 * Async route wrapper — catches thrown errors and forwards them to Express
 * error handler, so individual routes don't need try/catch boilerplate.
 *
 * @param {Function} fn  async (req, res, next) handler
 */
export function asyncRoute(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)
}
