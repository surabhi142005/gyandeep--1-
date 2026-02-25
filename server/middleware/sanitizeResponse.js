/**
 * server/middleware/sanitizeResponse.js
 *
 * Strip sensitive fields from user objects before sending them to clients.
 * Never expose password_hash, passwordHash, password, or faceImage in responses.
 */

const SENSITIVE_FIELDS = ['password', 'passwordHash', 'password_hash', 'faceImage', 'face_vector']

/**
 * Return a safe public-facing user DTO.
 * @param {object} user  raw user record from DB
 * @returns {object}
 */
export function toPublicUser(user) {
  if (!user || typeof user !== 'object') return user
  const safe = { ...user }
  for (const field of SENSITIVE_FIELDS) {
    delete safe[field]
  }
  return safe
}

/**
 * Express middleware: intercepts res.json() and strips sensitive fields
 * from any user object or array of user objects in the response body.
 *
 * Attach to specific routes that return user data.
 */
export function stripSensitiveFields(req, res, next) {
  const originalJson = res.json.bind(res)
  res.json = (data) => {
    if (Array.isArray(data)) {
      return originalJson(data.map(item => (item && item.email ? toPublicUser(item) : item)))
    }
    if (data && data.user) {
      data = { ...data, user: toPublicUser(data.user) }
    }
    if (data && data.email) {
      data = toPublicUser(data)
    }
    return originalJson(data)
  }
  next()
}
