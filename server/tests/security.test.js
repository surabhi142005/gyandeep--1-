/**
 * server/tests/security.test.js
 * Security tests for SQL/NoSQL injection prevention and input validation
 */

import { describe, test, expect, beforeAll, afterAll } from 'vitest';

const BASE_URL = process.env.TEST_API_URL || 'http://localhost:3001';

describe('Security Tests', () => {
  let authToken;

  beforeAll(async () => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'TestPassword123!'
      })
    });
    if (res.ok) {
      const data = await res.json();
      authToken = data.token;
    }
  });

  describe('NoSQL Injection Prevention', () => {
    test('should reject MongoDB operators in login', async () => {
      const maliciousInputs = [
        { email: { $ne: null }, password: { $ne: null } },
        { email: { $gt: '' }, password: { $gt: '' } },
        { email: { $where: '1==1' }, password: 'anything' },
        { email: { $regex: '.*' }, password: '.*' },
        { email: { $in: [] }, password: { $in: [] } },
      ];

      for (const payload of maliciousInputs) {
        const res = await fetch(`${BASE_URL}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        
        expect(res.status).toBeGreaterThanOrEqual(400);
        expect(res.status).not.toBe(200);
      }
    });

    test('should sanitize query operators in search', async () => {
      const maliciousQueries = [
        '?search[$ne]=null',
        '?search[$where]=1==1',
        '?search[$gt]=',
        '?filter={"$gt":""}',
      ];

      for (const query of maliciousQueries) {
        const res = await fetch(`${BASE_URL}/api/users/search${query}`, {
          headers: authToken ? { Authorization: `Bearer ${authToken}` } : {}
        });
        
        expect(res.status).not.toBe(500);
      }
    });

    test('should not allow operator injection in user fields', async () => {
      const res = await fetch(`${BASE_URL}/api/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authToken ? `Bearer ${authToken}` : ''
        },
        body: JSON.stringify({
          email: { $exists: true },
          name: 'test'
        })
      });
      
      expect(res.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('XSS Prevention', () => {
    test('should sanitize script tags in user input', async () => {
      const xssPayloads = [
        '<script>alert(1)</script>',
        '<img src=x onerror=alert(1)>',
        'javascript:alert(1)',
        '<svg onload=alert(1)>',
        '<iframe src="javascript:alert(1)">',
        "onclick=alert(1)",
        '<a href="javascript:alert(1)">click</a>',
      ];

      for (const payload of xssPayloads) {
        const res = await fetch(`${BASE_URL}/api/users`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: authToken ? `Bearer ${authToken}` : ''
          },
          body: JSON.stringify({
            email: `test-${Date.now()}@example.com`,
            name: payload,
            password: 'TestPassword123!'
          })
        });

        if (res.ok) {
          const data = await res.json();
          expect(data.name).not.toContain('<script>');
          expect(data.name).not.toContain('javascript:');
          expect(data.name).not.toContain('onerror');
        }
      }
    });

    test('should escape HTML in announcements', async () => {
      const res = await fetch(`${BASE_URL}/api/announcements`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authToken ? `Bearer ${authToken}` : ''
        },
        body: JSON.stringify({
          title: 'Test <script>alert(1)</script>',
          content: 'Content with <img src=x onerror=alert(1)>'
        })
      });

      if (res.ok) {
        const data = await res.json();
        expect(data.title).not.toContain('<script>');
        expect(data.content).not.toContain('onerror');
      }
    });

    test('should not allow inline event handlers', async () => {
      const res = await fetch(`${BASE_URL}/api/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authToken ? `Bearer ${authToken}` : ''
        },
        body: JSON.stringify({
          title: 'Note',
          content: 'onload=alert(1) content',
          classId: 'test-class-id',
          subjectId: 'test-subject-id'
        })
      });

      if (res.ok) {
        const data = await res.json();
        expect(data.content).not.toMatch(/on\w+=/i);
      }
    });
  });

  describe('CSRF Protection', () => {
    test('should reject requests without CSRF token', async () => {
      const protectedEndpoints = ['/api/users', '/api/grades', '/api/attendance'];

      for (const endpoint of protectedEndpoints) {
        const res = await fetch(`${BASE_URL}${endpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ test: 'data' })
        });

        expect([403, 401]).toContain(res.status);
      }
    });

    test('should accept valid CSRF tokens', async () => {
      const res = await fetch(`${BASE_URL}/api/auth/me`, {
        method: 'GET',
        headers: {
          'X-CSRF-Token': 'valid-token',
          'X-CSRF-Signature': 'valid-signature'
        },
        credentials: 'include'
      });

      expect(res.status).not.toBe(403);
    });
  });

  describe('Rate Limiting', () => {
    test('should enforce rate limits on auth endpoints', async () => {
      const attempts = [];
      
      for (let i = 0; i < 25; i++) {
        const res = await fetch(`${BASE_URL}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'attacker@example.com',
            password: 'wrongpassword'
          })
        });
        attempts.push(res.status);
      }

      const rateLimitedCount = attempts.filter(s => s === 429).length;
      expect(rateLimitedCount).toBeGreaterThan(0);
    });

    test('should enforce rate limits on API endpoints', async () => {
      const attempts = [];
      
      for (let i = 0; i < 150; i++) {
        const res = await fetch(`${BASE_URL}/api/users`, {
          headers: authToken ? { Authorization: `Bearer ${authToken}` } : {}
        });
        attempts.push(res.status);
        await new Promise(r => setTimeout(r, 10));
      }

      const rateLimitedCount = attempts.filter(s => s === 429).length;
      expect(rateLimitedCount).toBeGreaterThan(0);
    });
  });

  describe('Request Size Limits', () => {
    test('should reject oversized request bodies', async () => {
      const largePayload = { data: 'x'.repeat(11 * 1024 * 1024) };

      const res = await fetch(`${BASE_URL}/api/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authToken ? `Bearer ${authToken}` : ''
        },
        body: JSON.stringify(largePayload)
      });

      expect(res.status).toBe(413);
    });

    test('should accept valid sized requests', async () => {
      const validPayload = { data: 'x'.repeat(1024) };

      const res = await fetch(`${BASE_URL}/api/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authToken ? `Bearer ${authToken}` : ''
        },
        body: JSON.stringify(validPayload)
      });

      expect(res.status).not.toBe(413);
    });
  });

  describe('Security Headers', () => {
    test('should include security headers', async () => {
      const res = await fetch(`${BASE_URL}/api/health`);
      const headers = res.headers;

      expect(headers.get('X-Content-Type-Options')).toBe('nosniff');
      expect(headers.get('X-Frame-Options')).toBeTruthy();
      expect(headers.get('X-XSS-Protection')).toBeTruthy();
    });

    test('should include HSTS in production', async () => {
      const res = await fetch(`${BASE_URL}/api/health`);
      
      if (process.env.NODE_ENV === 'production') {
        expect(res.headers.get('Strict-Transport-Security')).toBeTruthy();
      }
    });
  });

  describe('Authentication', () => {
    test('should reject requests without valid token', async () => {
      const protectedEndpoints = [
        '/api/users',
        '/api/grades',
        '/api/attendance',
        '/api/notes'
      ];

      for (const endpoint of protectedEndpoints) {
        const res = await fetch(`${BASE_URL}${endpoint}`);
        expect([401, 403]).toContain(res.status);
      }
    });

    test('should reject expired tokens', async () => {
      const res = await fetch(`${BASE_URL}/api/users`, {
        headers: {
          Authorization: 'Bearer expired.invalid.token'
        }
      });

      expect(res.status).toBe(401);
    });
  });

  describe('Input Validation', () => {
    test('should reject invalid email formats', async () => {
      const invalidEmails = [
        'notanemail',
        '@nodomain.com',
        'spaces in@email.com',
        'test@',
        ''
      ];

      for (const email of invalidEmails) {
        const res = await fetch(`${BASE_URL}/api/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            password: 'TestPassword123!',
            name: 'Test User'
          })
        });

        expect(res.status).toBeGreaterThanOrEqual(400);
      }
    });

    test('should reject weak passwords', async () => {
      const weakPasswords = [
        '123',
        'password',
        'abc',
        ''
      ];

      for (const password of weakPasswords) {
        const res = await fetch(`${BASE_URL}/api/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: `test-${Date.now()}@example.com`,
            password,
            name: 'Test User'
          })
        });

        expect(res.status).toBeGreaterThanOrEqual(400);
      }
    });

    test('should validate required fields', async () => {
      const res = await fetch(`${BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });

      expect(res.status).toBeGreaterThanOrEqual(400);
      const data = await res.json();
      expect(data.error).toBeTruthy();
    });
  });
});
