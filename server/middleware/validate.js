/**
 * server/middleware/validate.js
 * Validation middleware for Express routes
 */

import { validate, ValidationError } from '../utils/validators.js';

export function validateBody(schema) {
  return (req, res, next) => {
    const result = validate(schema, req.body);
    
    if (!result.isValid()) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: result.errors,
        },
      });
    }
    
    next();
  };
}

export function validateQuery(schema) {
  return (req, res, next) => {
    const result = validate(schema, req.query);
    
    if (!result.isValid()) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid query parameters',
          details: result.errors,
        },
      });
    }
    
    next();
  };
}

export function validateParams(schema) {
  return (req, res, next) => {
    const result = validate(schema, req.params);
    
    if (!result.isValid()) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid URL parameters',
          details: result.errors,
        },
      });
    }
    
    next();
  };
}

export function validateId(paramName = 'id') {
  const schema = {
    [paramName]: [function(value, fieldName) {
      const { validators } = require('../utils/validators.js');
      return validators.isMongoId(value, fieldName);
    }],
  };
  
  return (req, res, next) => {
    const result = validate(schema, req.params);
    
    if (!result.isValid()) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid ID format',
          details: result.errors,
        },
      });
    }
    
    next();
  };
}

export function requireFields(...fields) {
  return (req, res, next) => {
    const missing = fields.filter(field => {
      const value = req.body[field];
      return value === undefined || value === null || value === '';
    });
    
    if (missing.length > 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_FIELDS',
          message: `Missing required fields: ${missing.join(', ')}`,
          fields: missing,
        },
      });
    }
    
    next();
  };
}