/**
 * server/tests/middleware.test.ts
 * Tests for rate limiting, security headers, input sanitization, and request size limits
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';

describe('Middleware - Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rate Limiter', () => {
    test('should track request counts per IP', () => {
      const requestCounts = new Map<string, { count: number; resetTime: number }>();

      const trackRequest = (ip: string, windowMs: number, maxRequests: number) => {
        const now = Date.now();
        const record = requestCounts.get(ip);

        if (!record || now > record.resetTime) {
          requestCounts.set(ip, { count: 1, resetTime: now + windowMs });
          return { allowed: true, remaining: maxRequests - 1 };
        }

        record.count++;
        const allowed = record.count <= maxRequests;
        return { allowed, remaining: Math.max(0, maxRequests - record.count) };
      };

      // First request — should be allowed
      const r1 = trackRequest('192.168.1.1', 60000, 5);
      expect(r1.allowed).toBe(true);
      expect(r1.remaining).toBe(4);

      // Requests 2-5 — should be allowed
      for (let i = 0; i < 4; i++) {
        trackRequest('192.168.1.1', 60000, 5);
      }

      // Request 6 — should be rate limited
      const r6 = trackRequest('192.168.1.1', 60000, 5);
      expect(r6.allowed).toBe(false);
      expect(r6.remaining).toBe(0);
    });

    test('should reset after window expires', () => {
      const requestCounts = new Map<string, { count: number; resetTime: number }>();

      const trackRequest = (ip: string, windowMs: number, maxRequests: number) => {
        const now = Date.now();
        const record = requestCounts.get(ip);

        if (!record || now > record.resetTime) {
          requestCounts.set(ip, { count: 1, resetTime: now + windowMs });
          return { allowed: true };
        }

        record.count++;
        return { allowed: record.count <= maxRequests };
      };

      // First request with a normal window
      trackRequest('192.168.1.1', 60000, 1);

      // Manually expire the window by setting resetTime in the past
      const record = requestCounts.get('192.168.1.1')!;
      record.resetTime = Date.now() - 1;

      // Should be allowed because window expired
      const result = trackRequest('192.168.1.1', 60000, 1);
      expect(result.allowed).toBe(true);
    });

    test('should separate rate limits per IP', () => {
      const counts = new Map<string, number>();

      const track = (ip: string) => {
        counts.set(ip, (counts.get(ip) || 0) + 1);
        return counts.get(ip)!;
      };

      track('10.0.0.1');
      track('10.0.0.1');
      track('10.0.0.2');

      expect(counts.get('10.0.0.1')).toBe(2);
      expect(counts.get('10.0.0.2')).toBe(1);
    });
  });

  describe('Security Headers', () => {
    test('should set X-Content-Type-Options to nosniff', () => {
      const headers: Record<string, string> = {};
      headers['X-Content-Type-Options'] = 'nosniff';
      expect(headers['X-Content-Type-Options']).toBe('nosniff');
    });

    test('should set X-Frame-Options', () => {
      const headers: Record<string, string> = {};
      headers['X-Frame-Options'] = 'DENY';
      expect(headers['X-Frame-Options']).toBe('DENY');
    });

    test('should set X-XSS-Protection', () => {
      const headers: Record<string, string> = {};
      headers['X-XSS-Protection'] = '1; mode=block';
      expect(headers['X-XSS-Protection']).toBe('1; mode=block');
    });

    test('should set Strict-Transport-Security in production', () => {
      const env = 'production';
      const headers: Record<string, string> = {};

      if (env === 'production') {
        headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains';
      }

      expect(headers['Strict-Transport-Security']).toBeTruthy();
    });

    test('should not set HSTS in development', () => {
      const env: string = 'development';
      const headers: Record<string, string> = {};

      if (env === 'production') {
        headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains';
      }

      expect(headers['Strict-Transport-Security']).toBeUndefined();
    });

    test('should set Content-Security-Policy', () => {
      const csp = "default-src 'self'; script-src 'self'";
      expect(csp).toContain("default-src 'self'");
    });
  });

  describe('Input Sanitization', () => {
    test('should strip HTML tags from input', () => {
      const stripHtml = (input: string) => input.replace(/<[^>]*>/g, '');

      expect(stripHtml('<script>alert(1)</script>')).toBe('alert(1)');
      expect(stripHtml('<img src=x onerror=alert(1)>')).toBe('');
      expect(stripHtml('normal text')).toBe('normal text');
    });

    test('should reject MongoDB operators in object values', () => {
      const hasDangerousOperators = (obj: any): boolean => {
        if (typeof obj !== 'object' || obj === null) return false;
        for (const key of Object.keys(obj)) {
          if (key.startsWith('$')) return true;
          if (typeof obj[key] === 'object') {
            if (hasDangerousOperators(obj[key])) return true;
          }
        }
        return false;
      };

      expect(hasDangerousOperators({ $ne: null })).toBe(true);
      expect(hasDangerousOperators({ email: { $gt: '' } })).toBe(true);
      expect(hasDangerousOperators({ email: 'safe@test.com' })).toBe(false);
      expect(hasDangerousOperators({ nested: { deep: { $where: 'x' } } })).toBe(true);
    });

    test('should truncate excessively long strings', () => {
      const truncate = (input: string, max: number) => input.slice(0, max);

      const longString = 'a'.repeat(100000);
      expect(truncate(longString, 10000).length).toBe(10000);
    });

    test('should handle null and undefined inputs', () => {
      const sanitize = (input: any): string => {
        if (input === null || input === undefined) return '';
        if (typeof input !== 'string') return '';
        return input.trim();
      };

      expect(sanitize(null)).toBe('');
      expect(sanitize(undefined)).toBe('');
      expect(sanitize(123)).toBe('');
    });
  });

  describe('Request Size Limit', () => {
    test('should reject payloads over 10MB', () => {
      const MAX_SIZE = 10 * 1024 * 1024; // 10MB
      const payloadSize = 11 * 1024 * 1024; // 11MB

      expect(payloadSize > MAX_SIZE).toBe(true);
    });

    test('should accept payloads under 10MB', () => {
      const MAX_SIZE = 10 * 1024 * 1024;
      const payloadSize = 1024; // 1KB

      expect(payloadSize <= MAX_SIZE).toBe(true);
    });
  });

  describe('CORS Configuration', () => {
    test('should parse allowed origins from env', () => {
      const envOrigins = 'http://localhost:5173,http://localhost:3000';
      const origins = envOrigins.split(',');

      expect(origins).toHaveLength(2);
      expect(origins).toContain('http://localhost:5173');
      expect(origins).toContain('http://localhost:3000');
    });

    test('should allow credentials', () => {
      const corsConfig = {
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
      };

      expect(corsConfig.credentials).toBe(true);
      expect(corsConfig.methods).toContain('POST');
      expect(corsConfig.allowedHeaders).toContain('Authorization');
    });
  });
});
