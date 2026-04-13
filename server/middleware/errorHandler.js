/**
 * server/middleware/errorHandler.js
 * Global error handler middleware with structured error responses
 */

import { ValidationError } from '../utils/validators.js';
import { 
  DatabaseError, 
  NotFoundError, 
  DuplicateError, 
  ForeignKeyError,
  InvalidObjectIdError 
} from '../utils/dbErrorHandler.js';

export class AppError extends Error {
  constructor(message, code = 'INTERNAL_ERROR', statusCode = 500, details = null) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.timestamp = new Date().toISOString();
    Error.captureStackTrace(this, this.constructor);
  }
}

export class AuthError extends AppError {
  constructor(message, code = 'AUTH_ERROR', statusCode = 401) {
    super(message, code, statusCode);
    this.name = 'AuthError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Access denied') {
    super(message, 'FORBIDDEN', 403);
    this.name = 'ForbiddenError';
  }
}

export class RateLimitError extends AppError {
  constructor(message = 'Too many requests') {
    super(message, 'RATE_LIMIT_EXCEEDED', 429);
    this.name = 'RateLimitError';
  }
}

export function errorHandler(err, req, res, next) {
  const requestId = req.headers['x-request-id'] || generateRequestId();

  console.error(`[Error] ${err.name}: ${err.message}`);
  console.error(`[Request-ID] ${requestId}`);
  console.error(`[Path] ${req.method} ${req.path}`);
  if (process.env.NODE_ENV !== 'production') {
    console.error(`[Stack] ${err.stack}`);
  }

  if (err.name === 'ValidationError' || err instanceof ValidationError) {
    return res.status(400).json({
      success: false,
      error: {
        code: err.code || 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: err.errors || [{ field: err.field, message: err.message }],
        requestId,
      },
    });
  }

  if (err.name === 'MongoError' || err.name === 'MongoServerError') {
    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'DUPLICATE_KEY',
          message: 'A record with this value already exists',
          field: extractDuplicateKey(err),
          requestId,
        },
      });
    }
    return res.status(500).json({
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: 'Database operation failed',
        requestId,
      },
    });
  }

  if (err instanceof DatabaseError || err.name === 'DatabaseError') {
    return res.status(err.statusCode || 500).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
        requestId,
      },
    });
  }

  if (err instanceof NotFoundError) {
    return res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: err.message,
        requestId,
      },
    });
  }

  if (err instanceof DuplicateError) {
    return res.status(409).json({
      success: false,
      error: {
        code: 'DUPLICATE',
        message: err.message,
        requestId,
      },
    });
  }

  if (err instanceof ForeignKeyError) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'FOREIGN_KEY_ERROR',
        message: err.message,
        requestId,
      },
    });
  }

  if (err instanceof InvalidObjectIdError) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_ID',
        message: err.message,
        requestId,
      },
    });
  }

  if (err instanceof AuthError) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        requestId,
      },
    });
  }

  if (err instanceof ForbiddenError) {
    return res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: err.message,
        requestId,
      },
    });
  }

  if (err instanceof RateLimitError) {
    return res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: err.message,
        retryAfter: err.retryAfter || 60,
        requestId,
      },
    });
  }

  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: 'Invalid or malformed token',
        requestId,
      },
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: {
        code: 'TOKEN_EXPIRED',
        message: 'Token has expired',
        requestId,
      },
    });
  }

  if (err.name === 'CastError' && err.kind === 'ObjectId') {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_ID',
        message: 'Invalid ID format',
        requestId,
      },
    });
  }

  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      success: false,
      error: {
        code: 'FILE_TOO_LARGE',
        message: 'File size exceeds maximum allowed',
        requestId,
      },
    });
  }

  if (err.code === 'LIMIT_PART_COUNT') {
    return res.status(400).json({
      success: false,
      error: {
        code: 'TOO_MANY_PARTS',
        message: 'Too many fields in request',
        requestId,
      },
    });
  }

  if (err.code === 'LIMIT_FILE_COUNT') {
    return res.status(400).json({
      success: false,
      error: {
        code: 'TOO_MANY_FILES',
        message: 'Too many files uploaded',
        requestId,
      },
    });
  }

  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_JSON',
        message: 'Invalid JSON in request body',
        requestId,
      },
    });
  }

  const statusCode = err.statusCode || err.status || 500;
  const message = process.env.NODE_ENV === 'production' 
    ? (err.publicMessage || 'Internal server error')
    : err.message;

  res.status(statusCode).json({
    success: false,
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message,
      ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
      requestId,
    },
  });
}

export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Cannot ${req.method} ${req.path}`,
    },
  });
}

function generateRequestId() {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function extractDuplicateKey(error) {
  const match = error.errmsg?.match(/index: (\w+)/);
  return match ? match[1] : null;
}