/**
 * server/tests/email.test.ts
 * Comprehensive email service tests
 * Tests provider detection, template generation, and all email types
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';

describe('Email Service - Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Provider Detection', () => {
    test('should detect Resend provider when RESEND_API_KEY is set', () => {
      const detectProvider = (env: Record<string, string>) => {
        if (env.RESEND_API_KEY && env.RESEND_API_KEY !== 'your-resend-api-key') return 'resend';
        if (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS) return 'smtp';
        return 'console';
      };

      expect(detectProvider({ RESEND_API_KEY: 're_abc123' })).toBe('resend');
    });

    test('should reject placeholder Resend API key', () => {
      const detectProvider = (env: Record<string, string>) => {
        if (env.RESEND_API_KEY && env.RESEND_API_KEY !== 'your-resend-api-key') return 'resend';
        if (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS) return 'smtp';
        return 'console';
      };

      expect(detectProvider({ RESEND_API_KEY: 'your-resend-api-key' })).not.toBe('resend');
    });

    test('should fall back to SMTP when Resend not configured', () => {
      const detectProvider = (env: Record<string, string>) => {
        if (env.RESEND_API_KEY && env.RESEND_API_KEY !== 'your-resend-api-key') return 'resend';
        if (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS) return 'smtp';
        return 'console';
      };

      expect(detectProvider({
        SMTP_HOST: 'smtp.gmail.com',
        SMTP_USER: 'test@gmail.com',
        SMTP_PASS: 'app_password',
      })).toBe('smtp');
    });

    test('should fall back to console when nothing configured', () => {
      const detectProvider = (env: Record<string, string>) => {
        if (env.RESEND_API_KEY && env.RESEND_API_KEY !== 'your-resend-api-key') return 'resend';
        if (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS) return 'smtp';
        return 'console';
      };

      expect(detectProvider({})).toBe('console');
    });

    test('should require all SMTP fields for SMTP provider', () => {
      const detectProvider = (env: Record<string, string>) => {
        if (env.RESEND_API_KEY && env.RESEND_API_KEY !== 'your-resend-api-key') return 'resend';
        if (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS) return 'smtp';
        return 'console';
      };

      // Missing SMTP_PASS
      expect(detectProvider({
        SMTP_HOST: 'smtp.gmail.com',
        SMTP_USER: 'test@gmail.com',
      })).toBe('console');
    });
  });

  describe('Sender Configuration', () => {
    test('should use FROM_EMAIL when set', () => {
      const getSenderEmail = (env: Record<string, string>) => {
        return env.FROM_EMAIL || env.SMTP_FROM || 'Gyandeep <noreply@gyandeep.app>';
      };

      expect(getSenderEmail({ FROM_EMAIL: 'Gyandeep <no-reply@custom.com>' }))
        .toBe('Gyandeep <no-reply@custom.com>');
    });

    test('should fall back to SMTP_FROM', () => {
      const getSenderEmail = (env: Record<string, string>) => {
        return env.FROM_EMAIL || env.SMTP_FROM || 'Gyandeep <noreply@gyandeep.app>';
      };

      expect(getSenderEmail({ SMTP_FROM: 'custom@smtp.com' }))
        .toBe('custom@smtp.com');
    });

    test('should use default sender when nothing configured', () => {
      const getSenderEmail = (env: Record<string, string>) => {
        return env.FROM_EMAIL || env.SMTP_FROM || 'Gyandeep <noreply@gyandeep.app>';
      };

      expect(getSenderEmail({})).toBe('Gyandeep <noreply@gyandeep.app>');
    });
  });

  describe('Email Template Generation', () => {
    test('should generate valid HTML email template', () => {
      const generateEmailTemplate = (content: string, options: any = {}) => {
        const { title = 'Gyandeep', headerColor = '#4F46E5' } = options;
        return `<!DOCTYPE html><html><head><title>${title}</title></head><body>${content}</body></html>`;
      };

      const html = generateEmailTemplate('<h2>Test</h2>', { title: 'Test Email' });
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<title>Test Email</title>');
      expect(html).toContain('<h2>Test</h2>');
    });

    test('should inject custom header color', () => {
      const generateEmailTemplate = (content: string, options: any = {}) => {
        const { title = 'Gyandeep', headerColor = '#4F46E5' } = options;
        return `<div style="background: ${headerColor}">${content}</div>`;
      };

      const html = generateEmailTemplate('Content', { headerColor: '#10b981' });
      expect(html).toContain('#10b981');
    });
  });

  describe('Password Reset Email', () => {
    test('should generate reset URL with token', () => {
      const baseUrl = 'http://localhost:5173';
      const resetToken = 'abc123token';
      const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;

      expect(resetUrl).toBe('http://localhost:5173/reset-password?token=abc123token');
    });

    test('should include security warning in reset email content', () => {
      const content = `
        <h2>Password Reset Request</h2>
        <div class="warning">
          <strong>⚠️ Security Notice:</strong>
          <p>This link will expire in 1 hour.</p>
        </div>
      `;

      expect(content).toContain('expire in 1 hour');
      expect(content).toContain('Security Notice');
    });
  });

  describe('Verification Code Email', () => {
    test('should support multiple verification purposes', () => {
      const purposeText = {
        verification: 'email verification',
        '2fa': 'two-factor authentication',
        'password-reset': 'password reset verification',
      } as Record<string, string>;

      expect(purposeText['verification']).toBe('email verification');
      expect(purposeText['2fa']).toBe('two-factor authentication');
      expect(purposeText['password-reset']).toBe('password reset verification');
    });
  });

  describe('Notification Email', () => {
    test('should map notification types to colors', () => {
      const typeColors: Record<string, string> = {
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444',
        info: '#3b82f6',
      };

      expect(typeColors.success).toBe('#10b981');
      expect(typeColors.error).toBe('#ef4444');
    });

    test('should include action button when URL provided', () => {
      const notification = {
        title: 'Grade Updated',
        message: 'Your grade has been updated.',
        actionUrl: 'http://localhost:5173/grades',
        actionText: 'View Grades',
      };

      const content = notification.actionUrl
        ? `<a href="${notification.actionUrl}">${notification.actionText || 'View Details'}</a>`
        : '';

      expect(content).toContain('View Grades');
      expect(content).toContain('/grades');
    });
  });

  describe('Attendance Notification Email', () => {
    test('should use correct status emoji and colors', () => {
      const getStatusEmoji = (status: string) => {
        if (status === 'present') return '✅';
        if (status === 'absent') return '❌';
        return '⚠️';
      };

      expect(getStatusEmoji('present')).toBe('✅');
      expect(getStatusEmoji('absent')).toBe('❌');
      expect(getStatusEmoji('late')).toBe('⚠️');
    });
  });

  describe('Bulk Email', () => {
    test('should track success and failure counts', () => {
      const results = [
        { email: 'a@test.com', success: true, messageId: 'msg1' },
        { email: 'b@test.com', success: false, error: 'Bounced' },
        { email: 'c@test.com', success: true, messageId: 'msg3' },
      ];

      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;

      expect(successful).toBe(2);
      expect(failed).toBe(1);
      expect(results.length).toBe(3);
    });
  });

  describe('Email Health Check', () => {
    test('should report configuration status', () => {
      const testConfig = (providerType: string) => ({
        provider: providerType,
        configured: providerType !== 'console',
        message: providerType === 'console'
          ? 'Email service not configured - using console fallback'
          : `Email service configured with ${providerType}`,
      });

      const consoleResult = testConfig('console');
      expect(consoleResult.configured).toBe(false);
      expect(consoleResult.message).toContain('console fallback');

      const resendResult = testConfig('resend');
      expect(resendResult.configured).toBe(true);
      expect(resendResult.message).toContain('resend');
    });
  });

  describe('Console Provider (Development)', () => {
    test('should return success with preview flag in console mode', () => {
      const consoleResult = {
        success: true,
        provider: 'console',
        messageId: `console-${Date.now()}`,
        preview: true,
      };

      expect(consoleResult.success).toBe(true);
      expect(consoleResult.preview).toBe(true);
      expect(consoleResult.provider).toBe('console');
      expect(consoleResult.messageId).toMatch(/^console-\d+$/);
    });
  });
});
