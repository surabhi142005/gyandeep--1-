/**
 * server/utils/dbErrorHandler.js
 * Database error handling utilities
 */

export class DatabaseError extends Error {
  constructor(message, code, statusCode = 500, details = null) {
    super(message);
    this.name = 'DatabaseError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

export class ValidationError extends DatabaseError {
  constructor(message, details = null) {
    super(message, 'VALIDATION_ERROR', 400, details);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends DatabaseError {
  constructor(resource, id = null) {
    const message = id 
      ? `${resource} with ID '${id}' not found`
      : `${resource} not found`;
    super(message, 'NOT_FOUND', 404);
    this.name = 'NotFoundError';
    this.resource = resource;
    this.id = id;
  }
}

export class DuplicateError extends DatabaseError {
  constructor(field, value) {
    super(`Duplicate value '${value}' for field '${field}'`, 'DUPLICATE_KEY', 409);
    this.name = 'DuplicateError';
    this.field = field;
    this.value = value;
  }
}

export class ForeignKeyError extends DatabaseError {
  constructor(field, referencedResource, referencedId) {
    super(
      `Referenced ${referencedResource} '${referencedId}' does not exist for field '${field}'`,
      'FOREIGN_KEY_VIOLATION',
      400
    );
    this.name = 'ForeignKeyError';
    this.field = field;
    this.referencedResource = referencedResource;
    this.referencedId = referencedId;
  }
}

export class InvalidObjectIdError extends DatabaseError {
  constructor(id) {
    super(`Invalid ObjectId format: '${id}'`, 'INVALID_OBJECT_ID', 400);
    this.name = 'InvalidObjectIdError';
    this.id = id;
  }
}

export function isValidObjectId(id) {
  if (!id || typeof id !== 'string') return false;
  return /^[a-fA-F0-9]{24}$/.test(id);
}

export function parseObjectId(id, fieldName = 'id') {
  if (!isValidObjectId(id)) {
    throw new InvalidObjectIdError(id);
  }
  return id;
}

export function handleDatabaseError(error, operation = 'database operation') {
  console.error(`Database error during ${operation}:`, error);

  if (error instanceof DatabaseError) {
    throw error;
  }

  const errorCode = error.code;
  const errorMessage = error.message || '';

  if (errorCode === 11000) {
    const match = errorMessage.match(/index: (\w+)/) || errorMessage.match(/_?(\w+)_?\s*dup\s*key/i);
    const fieldName = match ? match[1] : 'field';
    throw new DuplicateError(fieldName, 'value');
  }

  if (errorCode === 121) {
    throw new ValidationError('Document failed validation check');
  }

  if (errorMessage.includes('BSONObject')) {
    throw new InvalidObjectIdError('malformed');
  }

  if (errorMessage.includes('no such file')) {
    throw new DatabaseError(
      'Database file not found',
      'DB_NOT_FOUND',
      503
    );
  }

  if (errorMessage.includes('connection refused') || errorMessage.includes('ECONNREFUSED')) {
    throw new DatabaseError(
      'Database connection failed',
      'CONNECTION_FAILED',
      503
    );
  }

  if (errorMessage.includes('timed out') || errorCode === 50) {
    throw new DatabaseError(
      'Database operation timed out',
      'TIMEOUT',
      504
    );
  }

  throw new DatabaseError(
    `Failed to complete ${operation}`,
    'UNKNOWN_ERROR',
    500
  );
}

export function withTransaction(db, callback) {
  const session = db.client.startSession();
  return session.withTransaction(async () => {
    return callback(session);
  }).finally(() => {
    session.endSession();
  });
}

export function sanitizeErrorResponse(error) {
  if (error instanceof DatabaseError) {
    return {
      error: error.message,
      code: error.code,
      ...(error.details && { details: error.details })
    };
  }

  if (process.env.NODE_ENV === 'production') {
    return {
      error: 'An unexpected database error occurred',
      code: 'INTERNAL_ERROR'
    };
  }

  return {
    error: error.message,
    stack: error.stack,
    code: 'INTERNAL_ERROR'
  };
}

export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
