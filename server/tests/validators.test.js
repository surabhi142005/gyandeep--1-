/**
 * server/tests/validators.test.js
 * Unit tests for validation utilities
 */

import { describe, it, expect } from 'vitest';
import { validators, validate, ValidationResult, ValidationError } from '../utils/validators.js';

describe('ValidationResult', () => {
  it('should start with no errors', () => {
    const result = new ValidationResult();
    expect(result.isValid()).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should add errors correctly', () => {
    const result = new ValidationResult();
    result.addError('email', 'Invalid email', 'INVALID_EMAIL');
    expect(result.isValid()).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].field).toBe('email');
    expect(result.errors[0].code).toBe('INVALID_EMAIL');
  });

  it('should convert to JSON correctly', () => {
    const result = new ValidationResult();
    result.addError('name', 'Required', 'REQUIRED');
    const json = result.toJSON();
    expect(json.valid).toBe(false);
    expect(json.errors).toHaveLength(1);
  });

  it('should get error messages', () => {
    const result = new ValidationResult();
    result.addError('email', 'Invalid email');
    result.addError('password', 'Weak password');
    expect(result.getErrorMessages()).toEqual(['Invalid email', 'Weak password']);
  });
});

describe('validators.isRequired', () => {
  it('should fail for undefined', () => {
    const result = validators.isRequired(undefined, 'email');
    expect(result.isValid()).toBe(false);
  });

  it('should fail for null', () => {
    const result = validators.isRequired(null, 'email');
    expect(result.isValid()).toBe(false);
  });

  it('should fail for empty string', () => {
    const result = validators.isRequired('', 'email');
    expect(result.isValid()).toBe(false);
  });

  it('should pass for valid value', () => {
    const result = validators.isRequired('test@example.com', 'email');
    expect(result.isValid()).toBe(true);
  });
});

describe('validators.isEmail', () => {
  it('should pass for valid email', () => {
    const result = validators.isEmail('test@example.com', 'email');
    expect(result.isValid()).toBe(true);
  });

  it('should pass for email with subdomain', () => {
    const result = validators.isEmail('user@sub.domain.com', 'email');
    expect(result.isValid()).toBe(true);
  });

  it('should fail for email without @', () => {
    const result = validators.isEmail('testexample.com', 'email');
    expect(result.isValid()).toBe(false);
  });

  it('should fail for email without domain', () => {
    const result = validators.isEmail('test@', 'email');
    expect(result.isValid()).toBe(false);
  });

  it('should fail for email without TLD', () => {
    const result = validators.isEmail('test@example', 'email');
    expect(result.isValid()).toBe(false);
  });

  it('should pass for empty value (optional)', () => {
    const result = validators.isEmail('', 'email');
    expect(result.isValid()).toBe(true);
  });

  it('should fail for email exceeding 254 chars', () => {
    const longEmail = 'a'.repeat(250) + '@example.com';
    const result = validators.isEmail(longEmail, 'email');
    expect(result.isValid()).toBe(false);
  });
});

describe('validators.isPassword', () => {
  it('should pass for strong password', () => {
    const result = validators.isPassword('Secure123!', 'password');
    expect(result.isValid()).toBe(true);
  });

  it('should fail for short password', () => {
    const result = validators.isPassword('Short1!', 'password');
    expect(result.isValid()).toBe(false);
  });

  it('should fail without uppercase', () => {
    const result = validators.isPassword('secure123!', 'password');
    expect(result.isValid()).toBe(false);
  });

  it('should fail without lowercase', () => {
    const result = validators.isPassword('SECURE123!', 'password');
    expect(result.isValid()).toBe(false);
  });

  it('should fail without number', () => {
    const result = validators.isPassword('SecurePass!', 'password');
    expect(result.isValid()).toBe(false);
  });

  it('should fail without special character', () => {
    const result = validators.isPassword('Secure123', 'password');
    expect(result.isValid()).toBe(false);
  });
});

describe('validators.isString', () => {
  it('should pass for valid string', () => {
    const result = validators.isString('Hello', 'name');
    expect(result.isValid()).toBe(true);
  });

  it('should fail for non-string', () => {
    const result = validators.isString(123, 'name');
    expect(result.isValid()).toBe(false);
  });

  it('should fail for string below minLength', () => {
    const result = validators.isString('ab', 'name', { minLength: 3 });
    expect(result.isValid()).toBe(false);
  });

  it('should fail for string above maxLength', () => {
    const result = validators.isString('abcdef', 'name', { maxLength: 5 });
    expect(result.isValid()).toBe(false);
  });

  it('should fail for pattern mismatch', () => {
    const result = validators.isString('abc123', 'name', { pattern: /^[a-z]+$/ });
    expect(result.isValid()).toBe(false);
  });
});

describe('validators.isNumber', () => {
  it('should pass for valid number', () => {
    const result = validators.isNumber(42, 'age');
    expect(result.isValid()).toBe(true);
  });

  it('should pass for numeric string', () => {
    const result = validators.isNumber('42', 'age');
    expect(result.isValid()).toBe(true);
  });

  it('should fail for non-numeric string', () => {
    const result = validators.isNumber('abc', 'age');
    expect(result.isValid()).toBe(false);
  });

  it('should fail for number below min', () => {
    const result = validators.isNumber(5, 'age', { min: 10 });
    expect(result.isValid()).toBe(false);
  });

  it('should fail for number above max', () => {
    const result = validators.isNumber(150, 'age', { max: 100 });
    expect(result.isValid()).toBe(false);
  });

  it('should fail for non-integer when integer required', () => {
    const result = validators.isNumber(5.5, 'count', { integer: true });
    expect(result.isValid()).toBe(false);
  });
});

describe('validators.isBoolean', () => {
  it('should pass for true', () => {
    const result = validators.isBoolean(true, 'active');
    expect(result.isValid()).toBe(true);
  });

  it('should pass for false', () => {
    const result = validators.isBoolean(false, 'active');
    expect(result.isValid()).toBe(true);
  });

  it('should fail for string "true"', () => {
    const result = validators.isBoolean('true', 'active');
    expect(result.isValid()).toBe(false);
  });

  it('should fail for number 1', () => {
    const result = validators.isBoolean(1, 'active');
    expect(result.isValid()).toBe(false);
  });
});

describe('validators.isObject', () => {
  it('should pass for valid object', () => {
    const result = validators.isObject({ name: 'John' }, 'user');
    expect(result.isValid()).toBe(true);
  });

  it('should fail for array', () => {
    const result = validators.isObject([1, 2, 3], 'items');
    expect(result.isValid()).toBe(false);
  });

  it('should fail for primitive', () => {
    const result = validators.isObject('string', 'data');
    expect(result.isValid()).toBe(false);
  });

  it('should fail for empty object when not allowed', () => {
    const result = validators.isObject({}, 'user', { allowEmpty: false });
    expect(result.isValid()).toBe(false);
  });
});

describe('validators.isArray', () => {
  it('should pass for valid array', () => {
    const result = validators.isArray([1, 2, 3], 'items');
    expect(result.isValid()).toBe(true);
  });

  it('should fail for non-array', () => {
    const result = validators.isArray('not array', 'items');
    expect(result.isValid()).toBe(false);
  });

  it('should fail for array below minLength', () => {
    const result = validators.isArray([1], 'items', { minLength: 2 });
    expect(result.isValid()).toBe(false);
  });

  it('should fail for array above maxLength', () => {
    const result = validators.isArray([1, 2, 3], 'items', { maxLength: 2 });
    expect(result.isValid()).toBe(false);
  });
});

describe('validators.isMongoId', () => {
  it('should pass for valid ObjectId', () => {
    const result = validators.isMongoId('507f1f77bcf86cd799439011', 'id');
    expect(result.isValid()).toBe(true);
  });

  it('should fail for invalid ObjectId', () => {
    const result = validators.isMongoId('invalid', 'id');
    expect(result.isValid()).toBe(false);
  });

  it('should fail for ObjectId with wrong length', () => {
    const result = validators.isMongoId('507f1f77bcf86cd7994390', 'id');
    expect(result.isValid()).toBe(false);
  });

  it('should pass for empty value (optional)', () => {
    const result = validators.isMongoId('', 'id');
    expect(result.isValid()).toBe(true);
  });
});

describe('validators.isCoordinates', () => {
  it('should pass for valid coordinates', () => {
    const result = validators.isCoordinates({ lat: 40.7128, lng: -74.006 }, 'coords');
    expect(result.isValid()).toBe(true);
  });

  it('should fail for invalid type', () => {
    const result = validators.isCoordinates('40.7128,-74.006', 'coords');
    expect(result.isValid()).toBe(false);
  });

  it('should fail for invalid latitude', () => {
    const result = validators.isCoordinates({ lat: 100, lng: 0 }, 'coords');
    expect(result.isValid()).toBe(false);
  });

  it('should fail for invalid longitude', () => {
    const result = validators.isCoordinates({ lat: 0, lng: 200 }, 'coords');
    expect(result.isValid()).toBe(false);
  });
});

describe('validators.isBase64Image', () => {
  it('should pass for valid base64 image', () => {
    const result = validators.isBase64Image('data:image/png;base64,iVBORw0KGg==', 'image');
    expect(result.isValid()).toBe(true);
  });

  it('should fail for non-base64 string', () => {
    const result = validators.isBase64Image('not-an-image', 'image');
    expect(result.isValid()).toBe(false);
  });

  it('should pass for empty value (optional)', () => {
    const result = validators.isBase64Image('', 'image');
    expect(result.isValid()).toBe(true);
  });
});

describe('validators.isInEnum', () => {
  it('should pass for value in enum', () => {
    const result = validators.isInEnum('student', 'role', ['student', 'teacher', 'admin']);
    expect(result.isValid()).toBe(true);
  });

  it('should fail for value not in enum', () => {
    const result = validators.isInEnum('guest', 'role', ['student', 'teacher', 'admin']);
    expect(result.isValid()).toBe(false);
  });
});

describe('validators.isUrl', () => {
  it('should pass for valid URL', () => {
    const result = validators.isUrl('https://example.com', 'url');
    expect(result.isValid()).toBe(true);
  });

  it('should pass for valid URL with path', () => {
    const result = validators.isUrl('https://example.com/path/to/page', 'url');
    expect(result.isValid()).toBe(true);
  });

  it('should fail for invalid URL', () => {
    const result = validators.isUrl('not-a-url', 'url');
    expect(result.isValid()).toBe(false);
  });
});

describe('validators.isDate', () => {
  it('should pass for valid date string', () => {
    const result = validators.isDate('2024-01-15', 'date');
    expect(result.isValid()).toBe(true);
  });

  it('should pass for ISO date', () => {
    const result = validators.isDate('2024-01-15T10:30:00Z', 'date');
    expect(result.isValid()).toBe(true);
  });

  it('should fail for invalid date', () => {
    const result = validators.isDate('not-a-date', 'date');
    expect(result.isValid()).toBe(false);
  });
});

describe('validators.isPhoneNumber', () => {
  it('should pass for valid phone number', () => {
    const result = validators.isPhoneNumber('+1 555-123-4567', 'phone');
    expect(result.isValid()).toBe(true);
  });

  it('should fail for invalid phone number', () => {
    const result = validators.isPhoneNumber('123', 'phone');
    expect(result.isValid()).toBe(false);
  });
});

describe('validators.isName', () => {
  it('should pass for valid name', () => {
    const result = validators.isName('John Doe', 'name');
    expect(result.isValid()).toBe(true);
  });

  it('should fail for name too short', () => {
    const result = validators.isName('J', 'name');
    expect(result.isValid()).toBe(false);
  });

  it('should fail for name with invalid characters', () => {
    const result = validators.isName('John <script>', 'name');
    expect(result.isValid()).toBe(false);
  });
});

describe('validate with schema', () => {
  it('should validate login schema', () => {
    const schema = {
      email: [validators.isRequired, validators.isEmail],
      password: [validators.isRequired],
    };
    
    const result = validate(schema, { email: 'test@example.com', password: 'pass123' });
    expect(result.isValid()).toBe(true);
  });

  it('should fail validation with multiple errors', () => {
    const schema = {
      email: [validators.isRequired, validators.isEmail],
      password: [validators.isRequired],
    };
    
    const result = validate(schema, { email: 'invalid', password: '' });
    expect(result.isValid()).toBe(false);
    expect(result.errors.length).toBeGreaterThan(1);
  });

  it('should pass for empty optional fields', () => {
    const schema = {
      email: [validators.isEmail],
      name: [validators.isName],
    };
    
    const result = validate(schema, {});
    expect(result.isValid()).toBe(true);
  });
});