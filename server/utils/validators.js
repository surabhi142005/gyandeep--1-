/**
 * server/utils/validators.js
 * Input validation utilities with comprehensive validation rules
 */

export class ValidationError extends Error {
  constructor(message, field, value, code = 'VALIDATION_ERROR') {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
    this.value = value;
    this.code = code;
  }
}

export class ValidationResult {
  constructor() {
    this.errors = [];
  }

  addError(field, message, code = 'INVALID_VALUE') {
    this.errors.push({ field, message, code });
  }

  isValid() {
    return this.errors.length === 0;
  }

  toJSON() {
    return {
      valid: this.isValid(),
      errors: this.errors,
    };
  }

  getErrorMessages() {
    return this.errors.map(e => e.message);
  }
}

export const validators = {
  isRequired(value, fieldName = 'field') {
    const result = new ValidationResult();
    if (value === undefined || value === null || value === '') {
      result.addError(fieldName, `${fieldName} is required`, 'REQUIRED');
    }
    return result;
  },

  isEmail(value, fieldName = 'email') {
    const result = new ValidationResult();
    if (value === undefined || value === null || value === '') {
      return result;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      result.addError(fieldName, 'Invalid email format', 'INVALID_EMAIL');
    }
    if (value.length > 254) {
      result.addError(fieldName, 'Email too long (max 254 characters)', 'EMAIL_TOO_LONG');
    }
    return result;
  },

  isPassword(value, fieldName = 'password') {
    const result = new ValidationResult();
    if (!value) {
      return result;
    }
    const errors = [];
    if (value.length < 8) errors.push('at least 8 characters');
    if (!/[A-Z]/.test(value)) errors.push('one uppercase letter');
    if (!/[a-z]/.test(value)) errors.push('one lowercase letter');
    if (!/[0-9]/.test(value)) errors.push('one number');
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(value)) errors.push('one special character');
    if (errors.length > 0) {
      result.addError(fieldName, `Password must contain: ${errors.join(', ')}`, 'WEAK_PASSWORD');
    }
    return result;
  },

  isString(value, fieldName = 'field', options = {}) {
    const result = new ValidationResult();
    if (value === undefined || value === null) {
      return result;
    }
    if (typeof value !== 'string') {
      result.addError(fieldName, `${fieldName} must be a string`, 'INVALID_TYPE');
      return result;
    }
    if (options.minLength && value.length < options.minLength) {
      result.addError(fieldName, `${fieldName} must be at least ${options.minLength} characters`, 'TOO_SHORT');
    }
    if (options.maxLength && value.length > options.maxLength) {
      result.addError(fieldName, `${fieldName} must be at most ${options.maxLength} characters`, 'TOO_LONG');
    }
    if (options.pattern && !options.pattern.test(value)) {
      result.addError(fieldName, options.message || `${fieldName} has invalid format`, 'INVALID_FORMAT');
    }
    return result;
  },

  isNumber(value, fieldName = 'field', options = {}) {
    const result = new ValidationResult();
    if (value === undefined || value === null || value === '') {
      return result;
    }
    const num = typeof value === 'number' ? value : parseFloat(value);
    if (isNaN(num)) {
      result.addError(fieldName, `${fieldName} must be a number`, 'INVALID_NUMBER');
      return result;
    }
    if (options.min !== undefined && num < options.min) {
      result.addError(fieldName, `${fieldName} must be at least ${options.min}`, 'BELOW_MIN');
    }
    if (options.max !== undefined && num > options.max) {
      result.addError(fieldName, `${fieldName} must be at most ${options.max}`, 'ABOVE_MAX');
    }
    if (options.integer && !Number.isInteger(num)) {
      result.addError(fieldName, `${fieldName} must be an integer`, 'NOT_INTEGER');
    }
    return result;
  },

  isBoolean(value, fieldName = 'field') {
    const result = new ValidationResult();
    if (value === undefined || value === null) {
      return result;
    }
    if (typeof value !== 'boolean') {
      result.addError(fieldName, `${fieldName} must be a boolean`, 'INVALID_BOOLEAN');
    }
    return result;
  },

  isObject(value, fieldName = 'field', options = {}) {
    const result = new ValidationResult();
    if (value === undefined || value === null) {
      return result;
    }
    if (typeof value !== 'object' || Array.isArray(value)) {
      result.addError(fieldName, `${fieldName} must be an object`, 'INVALID_OBJECT');
      return result;
    }
    if (options.allowEmpty === false && Object.keys(value).length === 0) {
      result.addError(fieldName, `${fieldName} cannot be empty`, 'EMPTY_OBJECT');
    }
    return result;
  },

  isArray(value, fieldName = 'field', options = {}) {
    const result = new ValidationResult();
    if (value === undefined || value === null) {
      return result;
    }
    if (!Array.isArray(value)) {
      result.addError(fieldName, `${fieldName} must be an array`, 'INVALID_ARRAY');
      return result;
    }
    if (options.minLength !== undefined && value.length < options.minLength) {
      result.addError(fieldName, `${fieldName} must have at least ${options.minLength} items`, 'ARRAY_TOO_SHORT');
    }
    if (options.maxLength !== undefined && value.length > options.maxLength) {
      result.addError(fieldName, `${fieldName} must have at most ${options.maxLength} items`, 'ARRAY_TOO_LONG');
    }
    if (options.itemType) {
      value.forEach((item, index) => {
        const itemResult = validateType(item, options.itemType, `${fieldName}[${index}]`);
        if (!itemResult.isValid()) {
          result.errors.push(...itemResult.errors);
        }
      });
    }
    return result;
  },

  isMongoId(value, fieldName = 'id') {
    const result = new ValidationResult();
    if (!value) {
      return result;
    }
    const mongoIdRegex = /^[a-fA-F0-9]{24}$/;
    if (!mongoIdRegex.test(value)) {
      result.addError(fieldName, 'Invalid ID format', 'INVALID_ID');
    }
    return result;
  },

  isCoordinates(value, fieldName = 'coordinates') {
    const result = new ValidationResult();
    if (!value) {
      return result;
    }
    if (typeof value !== 'object') {
      result.addError(fieldName, `${fieldName} must be an object`, 'INVALID_TYPE');
      return result;
    }
    const { lat, lng } = value;
    if (typeof lat !== 'number' || typeof lng !== 'number') {
      result.addError(fieldName, `${fieldName} must have lat and lng as numbers`, 'INVALID_COORDINATES');
      return result;
    }
    if (lat < -90 || lat > 90) {
      result.addError(fieldName, 'Latitude must be between -90 and 90', 'INVALID_LATITUDE');
    }
    if (lng < -180 || lng > 180) {
      result.addError(fieldName, 'Longitude must be between -180 and 180', 'INVALID_LONGITUDE');
    }
    return result;
  },

  isBase64Image(value, fieldName = 'image') {
    const result = new ValidationResult();
    if (!value) {
      return result;
    }
    const base64Regex = /^data:image\/\w+;base64,/;
    if (!base64Regex.test(value)) {
      result.addError(fieldName, `${fieldName} must be a valid base64 image`, 'INVALID_IMAGE');
      return result;
    }
    const base64Data = value.replace(base64Regex, '');
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(base64Data)) {
      result.addError(fieldName, `${fieldName} contains invalid base64 characters`, 'INVALID_BASE64');
    }
    return result;
  },

  isInEnum(value, fieldName = 'field', allowedValues = []) {
    const result = new ValidationResult();
    if (value === undefined || value === null) {
      return result;
    }
    if (!allowedValues.includes(value)) {
      result.addError(fieldName, `${fieldName} must be one of: ${allowedValues.join(', ')}`, 'INVALID_ENUM');
    }
    return result;
  },

  isUrl(value, fieldName = 'url') {
    const result = new ValidationResult();
    if (!value) {
      return result;
    }
    try {
      new URL(value);
    } catch {
      result.addError(fieldName, 'Invalid URL format', 'INVALID_URL');
    }
    return result;
  },

  isDate(value, fieldName = 'date') {
    const result = new ValidationResult();
    if (!value) {
      return result;
    }
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      result.addError(fieldName, 'Invalid date format', 'INVALID_DATE');
    }
    return result;
  },

  isDateRange(value, fieldName = 'dateRange') {
    const result = new ValidationResult();
    if (!value) {
      return result;
    }
    if (!value.startDate || !value.endDate) {
      result.addError(fieldName, 'Date range must have startDate and endDate', 'MISSING_DATES');
      return result;
    }
    const start = new Date(value.startDate);
    const end = new Date(value.endDate);
    if (isNaN(start.getTime())) {
      result.addError(fieldName, 'Invalid start date', 'INVALID_START_DATE');
    }
    if (isNaN(end.getTime())) {
      result.addError(fieldName, 'Invalid end date', 'INVALID_END_DATE');
    }
    if (start > end) {
      result.addError(fieldName, 'Start date must be before end date', 'INVALID_RANGE');
    }
    return result;
  },

  isPhoneNumber(value, fieldName = 'phone') {
    const result = new ValidationResult();
    if (!value) {
      return result;
    }
    const phoneRegex = /^\+?[\d\s-]{10,20}$/;
    if (!phoneRegex.test(value)) {
      result.addError(fieldName, 'Invalid phone number format', 'INVALID_PHONE');
    }
    return result;
  },

  isName(value, fieldName = 'name') {
    const result = new ValidationResult();
    if (!value) {
      return result;
    }
    if (typeof value !== 'string') {
      result.addError(fieldName, `${fieldName} must be a string`, 'INVALID_TYPE');
      return result;
    }
    if (value.length < 2) {
      result.addError(fieldName, `${fieldName} must be at least 2 characters`, 'TOO_SHORT');
    }
    if (value.length > 100) {
      result.addError(fieldName, `${fieldName} must be at most 100 characters`, 'TOO_LONG');
    }
    if (!/^[a-zA-Z\s\-'.]+$/.test(value)) {
      result.addError(fieldName, `${fieldName} contains invalid characters`, 'INVALID_CHARS');
    }
    return result;
  },
};

function validateType(value, type, fieldName) {
  switch (type) {
    case 'string':
      return validators.isString(value, fieldName);
    case 'number':
      return validators.isNumber(value, fieldName);
    case 'boolean':
      return validators.isBoolean(value, fieldName);
    case 'object':
      return validators.isObject(value, fieldName);
    case 'array':
      return validators.isArray(value, fieldName);
    case 'email':
      return validators.isEmail(value, fieldName);
    case 'mongoId':
      return validators.isMongoId(value, fieldName);
    case 'date':
      return validators.isDate(value, fieldName);
    default:
      return new ValidationResult();
  }
}

export function validate(schema, data) {
  const result = new ValidationResult();
  
  for (const [field, rules] of Object.entries(schema)) {
    const value = data[field];
    
    for (const rule of rules) {
      let ruleResult;
      
      if (typeof rule === 'function') {
        ruleResult = rule(value, field);
      } else if (typeof rule === 'object') {
        const validatorName = rule.validator;
        const options = rule.options || {};
        const message = rule.message;
        
        if (validators[validatorName]) {
          ruleResult = validators[validatorName](value, field, options);
          if (!ruleResult.isValid() && message) {
            ruleResult.errors[0].message = message;
          }
        }
      } else if (typeof rule === 'string') {
        if (validators[rule]) {
          ruleResult = validators[rule](value, field);
        }
      }
      
      if (ruleResult && !ruleResult.isValid()) {
        result.errors.push(...ruleResult.errors);
      }
    }
  }
  
  return result;
}

export function sanitizeInput(input, maxLength = 100000) {
  if (typeof input !== 'string') return input;
  
  return input
    .slice(0, maxLength)
    .replace(/[<>]/g, '')
    .trim();
}

export function validateAndSanitize(schema, data) {
  const validationResult = validate(schema, data);
  
  if (!validationResult.isValid()) {
    return {
      valid: false,
      errors: validationResult.errors,
      sanitized: null,
    };
  }
  
  const sanitized = {};
  for (const [key, value] of Object.entries(data)) {
    sanitized[key] = typeof value === 'string' ? sanitizeInput(value) : value;
  }
  
  return {
    valid: true,
    errors: [],
    sanitized,
  };
}