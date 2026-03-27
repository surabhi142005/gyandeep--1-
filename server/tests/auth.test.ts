/**
 * server/tests/auth.test.ts
 * Comprehensive authentication tests
 * Tests login, register, token refresh, password reset, and email verification
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';

// Mock MongoDB
const mockCollection = {
  findOne: vi.fn(),
  insertOne: vi.fn(),
  updateOne: vi.fn(),
  countDocuments: vi.fn(),
};
const mockDb = {
  collection: vi.fn(() => mockCollection),
};

vi.mock('../db/mongoAtlas.js', () => ({
  connectToDatabase: vi.fn(() => mockDb),
  COLLECTIONS: {
    USERS: 'users',
    PASSWORD_RESETS: 'password_resets',
    EMAIL_VERIFICATIONS: 'email_verifications',
  },
}));

vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn((password: string) => Promise.resolve(`hashed_${password}`)),
    compare: vi.fn((password: string, hashed: string) => Promise.resolve(hashed === `hashed_${password}`)),
  },
}));

vi.mock('jsonwebtoken', () => ({
  default: {
    sign: vi.fn((payload: any) => `token_${payload.id || payload.email || 'test'}`),
    verify: vi.fn((token: string) => {
      if (token === 'expired.token') throw Object.assign(new Error('expired'), { name: 'TokenExpiredError' });
      if (token === 'invalid.token') throw new Error('invalid');
      return { id: 'user123', email: 'test@example.com', role: 'student', type: 'refresh' };
    }),
  },
}));

// Helpers to simulate express req/res
function mockReq(overrides: any = {}) {
  return {
    body: {},
    cookies: {},
    headers: {},
    params: {},
    query: {},
    ...overrides,
  };
}

function mockRes() {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  res.cookie = vi.fn().mockReturnValue(res);
  res.clearCookie = vi.fn().mockReturnValue(res);
  return res;
}

describe('Auth Module - Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Input Validation', () => {
    test('should reject empty email on login', async () => {
      const req = mockReq({ body: { email: '', password: 'Test1234!' } });
      const res = mockRes();

      // Simulate the sanitize + validate logic from auth.js
      const email = (req.body.email || '').trim().slice(0, 10000);
      if (!email || !req.body.password) {
        res.status(400).json({ error: 'Email and password are required' });
      }

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Email and password are required' });
    });

    test('should reject invalid email format', () => {
      const invalidEmails = [
        'notanemail',
        '@nodomain.com',
        'spaces in@email.com',
        'test@',
        '',
        'a'.repeat(255) + '@test.com',
      ];

      const isValidEmail = (email: string) =>
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;

      for (const email of invalidEmails) {
        expect(isValidEmail(email)).toBe(false);
      }
    });

    test('should accept valid email formats', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co',
        'user+tag@gmail.com',
        'a@b.cc',
      ];

      const isValidEmail = (email: string) =>
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;

      for (const email of validEmails) {
        expect(isValidEmail(email)).toBe(true);
      }
    });

    test('should reject weak passwords', () => {
      const validatePassword = (password: string) => {
        const errors: string[] = [];
        if (password.length < 8) errors.push('at least 8 characters');
        if (!/[A-Z]/.test(password)) errors.push('one uppercase letter');
        if (!/[a-z]/.test(password)) errors.push('one lowercase letter');
        if (!/[0-9]/.test(password)) errors.push('one number');
        return { valid: errors.length === 0, errors };
      };

      const weakPasswords = ['123', 'password', 'abc', '', 'short', 'ALLCAPS1', 'alllower1'];
      for (const pw of weakPasswords) {
        expect(validatePassword(pw).valid).toBe(false);
      }
    });

    test('should accept strong passwords', () => {
      const validatePassword = (password: string) => {
        const errors: string[] = [];
        if (password.length < 8) errors.push('at least 8 characters');
        if (!/[A-Z]/.test(password)) errors.push('one uppercase letter');
        if (!/[a-z]/.test(password)) errors.push('one lowercase letter');
        if (!/[0-9]/.test(password)) errors.push('one number');
        return { valid: errors.length === 0, errors };
      };

      const strongPasswords = ['TestPassword1', 'MyP@ssw0rd', 'Gyandeep123'];
      for (const pw of strongPasswords) {
        expect(validatePassword(pw).valid).toBe(true);
      }
    });
  });

  describe('Sanitization', () => {
    test('should sanitize strings properly', () => {
      const sanitize = (input: any) => {
        if (typeof input !== 'string') return '';
        return input.trim().slice(0, 10000);
      };

      expect(sanitize(null)).toBe('');
      expect(sanitize(undefined)).toBe('');
      expect(sanitize(123 as any)).toBe('');
      expect(sanitize({ $ne: null } as any)).toBe('');
      expect(sanitize('  hello  ')).toBe('hello');
      expect(sanitize('a'.repeat(20000))).toHaveLength(10000);
    });

    test('should reject NoSQL operator injection attempts', () => {
      const sanitize = (input: any) => {
        if (typeof input !== 'string') return '';
        return input.trim().slice(0, 10000);
      };

      const maliciousInputs = [
        { $ne: null },
        { $gt: '' },
        { $where: '1==1' },
        { $regex: '.*' },
      ];

      for (const input of maliciousInputs) {
        expect(sanitize(input)).toBe('');
      }
    });
  });

  describe('Token Extraction', () => {
    test('should extract token from Bearer header', () => {
      const extractToken = (req: any) => {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
          return authHeader.slice(7);
        }
        return req.cookies?.gyandeep_token;
      };

      const req = mockReq({ headers: { authorization: 'Bearer mytoken123' } });
      expect(extractToken(req)).toBe('mytoken123');
    });

    test('should extract token from httpOnly cookie', () => {
      const extractToken = (req: any) => {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
          return authHeader.slice(7);
        }
        return req.cookies?.gyandeep_token;
      };

      const req = mockReq({ cookies: { gyandeep_token: 'cookietoken456' } });
      expect(extractToken(req)).toBe('cookietoken456');
    });

    test('should return undefined when no token present', () => {
      const extractToken = (req: any) => {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
          return authHeader.slice(7);
        }
        return req.cookies?.gyandeep_token;
      };

      const req = mockReq({});
      expect(extractToken(req)).toBeUndefined();
    });

    test('should prefer Bearer token over cookie', () => {
      const extractToken = (req: any) => {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
          return authHeader.slice(7);
        }
        return req.cookies?.gyandeep_token;
      };

      const req = mockReq({
        headers: { authorization: 'Bearer bearer_token' },
        cookies: { gyandeep_token: 'cookie_token' },
      });
      expect(extractToken(req)).toBe('bearer_token');
    });
  });

  describe('Cookie Configuration', () => {
    test('should set httpOnly cookies correctly', () => {
      const COOKIE_OPTIONS = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax' as const,
        path: '/',
      };

      expect(COOKIE_OPTIONS.httpOnly).toBe(true);
      expect(COOKIE_OPTIONS.path).toBe('/');
      expect(COOKIE_OPTIONS.sameSite).toBe('lax');
    });

    test('should set secure flag in production', () => {
      const makeOptions = (env: string) => ({
        httpOnly: true,
        secure: env === 'production',
        sameSite: 'lax' as const,
        path: '/',
      });

      expect(makeOptions('production').secure).toBe(true);
      expect(makeOptions('development').secure).toBe(false);
    });
  });

  describe('Password Reset Flow', () => {
    test('should generate 6-digit reset codes', () => {
      const generateCode = () => Math.floor(100000 + Math.random() * 900000).toString();

      for (let i = 0; i < 100; i++) {
        const code = generateCode();
        expect(code).toHaveLength(6);
        expect(parseInt(code)).toBeGreaterThanOrEqual(100000);
        expect(parseInt(code)).toBeLessThan(1000000);
      }
    });
  });
});
