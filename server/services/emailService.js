/**
 * server/services/emailService.js
 * Email service for notifications, password reset, and verification
 * Supports Resend API and SMTP fallback
 */

import { Resend } from 'resend';
import nodemailer from 'nodemailer';

// Email provider types
const PROVIDERS = {
  RESEND: 'resend',
  SMTP: 'smtp',
  CONSOLE: 'console',
};

let emailProvider = null;
let providerType = PROVIDERS.CONSOLE;

const FRONTEND_URL = process.env.VITE_APP_URL || (process.env.NODE_ENV === 'production' ? 'https://gyandeep.edu' : 'http://localhost:5173');

/**
 * Initialize the email service
 */
function initializeEmailService() {
  if (emailProvider) return emailProvider;

  // Try Resend first
  const resendApiKey = process.env.RESEND_API_KEY;
  if (resendApiKey && resendApiKey !== 'your-resend-api-key') {
    try {
      emailProvider = new Resend(resendApiKey);
      providerType = PROVIDERS.RESEND;
      console.log('[Email] Initialized with Resend provider');
      return emailProvider;
    } catch (error) {
      console.warn('[Email] Failed to initialize Resend:', error.message);
    }
  }

  // Try SMTP as fallback
  const smtpHost = process.env.SMTP_HOST;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  if (smtpHost && smtpUser && smtpPass) {
    try {
      emailProvider = nodemailer.createTransport({
        host: smtpHost,
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: parseInt(process.env.SMTP_PORT || '587', 10) === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });
      providerType = PROVIDERS.SMTP;
      console.log('[Email] Initialized with SMTP provider');
      return emailProvider;
    } catch (error) {
      console.warn('[Email] Failed to initialize SMTP:', error.message);
    }
  }

  // Console fallback for development
  console.log('[Email] Using console provider (no real emails sent)');
  providerType = PROVIDERS.CONSOLE;
  return null;
}

/**
 * Get sender email address
 */
function getSenderEmail() {
  return process.env.RESEND_FROM_EMAIL || process.env.FROM_EMAIL || process.env.SMTP_FROM || 'Gyandeep <noreply@gyandeep.app>';
}

/**
 * Get support email address
 */
function getSupportEmail() {
  return process.env.EMAIL_FROM_SUPPORT || 'support@gyandeep.app';
}

/**
 * Send email using the configured provider
 */
async function sendEmail({ to, subject, html, text, from, replyTo, attachments = [] }) {
  const provider = initializeEmailService();
  const senderEmail = from || getSenderEmail();

  const emailData = {
    from: senderEmail,
    to: Array.isArray(to) ? to.join(', ') : to,
    subject,
    text: text || html.replace(/<[^>]*>/g, ''),
    html,
    replyTo: replyTo || getSupportEmail(),
    attachments,
  };

  // Console logging for development
  if (providerType === PROVIDERS.CONSOLE || !provider) {
    console.log('\n' + '='.repeat(60));
    console.log('[EMAIL] Console Provider - Email would be sent:');
    console.log('-'.repeat(60));
    console.log(`From: ${emailData.from}`);
    console.log(`To: ${emailData.to}`);
    console.log(`Subject: ${emailData.subject}`);
    console.log(`Reply-To: ${emailData.replyTo}`);
    console.log('-'.repeat(60));
    console.log('HTML Preview (first 500 chars):');
    console.log(emailData.html.substring(0, 500) + '...');
    console.log('='.repeat(60) + '\n');

    return {
      success: true,
      provider: PROVIDERS.CONSOLE,
      messageId: `console-${Date.now()}`,
      preview: true,
    };
  }

  try {
    let result;

    if (providerType === PROVIDERS.RESEND) {
      result = await provider.emails.send({
        from: emailData.from,
        to: emailData.to,
        subject: emailData.subject,
        html: emailData.html,
        text: emailData.text,
        reply_to: emailData.replyTo,
        attachments: attachments.map(att => ({
          filename: att.filename,
          content: att.content,
        })),
      });
    } else if (providerType === PROVIDERS.SMTP) {
      result = await provider.sendMail(emailData);
    }

    console.log('[Email] Sent successfully:', result?.id || result?.messageId);

    return {
      success: true,
      provider: providerType,
      messageId: result?.id || result?.messageId,
      preview: false,
    };
  } catch (error) {
    console.error('[Email] Send failed:', error.message);
    throw new Error(`Failed to send email: ${error.message}`);
  }
}

/**
 * Generate email template with consistent styling
 */
function generateEmailTemplate(content, options = {}) {
  const { title = 'Gyandeep', headerColor = '#4F46E5' } = options;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background-color: #f5f5f5;
      margin: 0;
      padding: 20px;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      overflow: hidden;
    }
    .header {
      background: ${headerColor};
      color: white;
      padding: 30px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 600;
    }
    .content {
      padding: 30px;
    }
    .button {
      display: inline-block;
      background: ${headerColor};
      color: white;
      padding: 12px 24px;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 500;
      margin: 15px 0;
    }
    .footer {
      background: #f9fafb;
      padding: 20px;
      text-align: center;
      font-size: 12px;
      color: #6b7280;
    }
    .code-box {
      background: #f3f4f6;
      border: 2px dashed #d1d5db;
      border-radius: 8px;
      padding: 20px;
      text-align: center;
      font-family: 'Courier New', monospace;
      font-size: 24px;
      font-weight: bold;
      letter-spacing: 4px;
      color: #1f2937;
      margin: 20px 0;
    }
    .warning {
      background: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 15px;
      margin: 15px 0;
      border-radius: 4px;
    }
    .info {
      background: #dbeafe;
      border-left: 4px solid #3b82f6;
      padding: 15px;
      margin: 15px 0;
      border-radius: 4px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎓 Gyandeep</h1>
      <p style="margin: 10px 0 0 0; opacity: 0.9;">AI Smart Classroom</p>
    </div>
    <div class="content">
      ${content}
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} Gyandeep. All rights reserved.</p>
      <p>This email was sent from Gyandeep AI Smart Classroom.</p>
      <p>Need help? Contact us at <a href="mailto:${getSupportEmail()}">${getSupportEmail()}</a></p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(email, resetToken, userName = '') {
  const resetUrl = `${FRONTEND_URL}/reset-password?token=${resetToken}`;

  const content = `
    <h2>Password Reset Request</h2>
    <p>Hi ${userName || 'there'},</p>
    <p>We received a request to reset your password for your Gyandeep account. Click the button below to reset it:</p>
    <a href="${resetUrl}" class="button">Reset Password</a>
    <p>Or copy and paste this link into your browser:</p>
    <p style="word-break: break-all; color: #6b7280;">${resetUrl}</p>
    <div class="warning">
      <strong>⚠️ Security Notice:</strong>
      <p>This link will expire in 1 hour. If you didn't request this password reset, please ignore this email or contact support if you're concerned.</p>
    </div>
  `;

  return sendEmail({
    to: email,
    subject: 'Reset your Gyandeep password',
    html: generateEmailTemplate(content, { title: 'Password Reset' }),
    text: `Password Reset\n\nHi ${userName || 'there'},\n\nWe received a request to reset your password. Visit: ${resetUrl}\n\nThis link expires in 1 hour.`,
  });
}

/**
 * Send verification code email
 */
export async function sendVerificationCode(email, code, purpose = 'verification') {
  const purposeText = {
    verification: 'email verification',
    '2fa': 'two-factor authentication',
    'password-reset': 'password reset verification',
  }[purpose] || 'verification';

  const content = `
    <h2>Verification Code</h2>
    <p>Hi there,</p>
    <p>Use the verification code below to complete your ${purposeText}:</p>
    <div class="code-box">${code}</div>
    <div class="warning">
      <strong>⏰ Time Limit:</strong>
      <p>This code will expire in 10 minutes. Do not share this code with anyone.</p>
    </div>
    <div class="info">
      <strong>Didn't request this?</strong>
      <p>If you didn't request this code, you can safely ignore this email. Someone may have entered your email address by mistake.</p>
    </div>
  `;

  return sendEmail({
    to: email,
    subject: `Your Gyandeep ${purposeText} code`,
    html: generateEmailTemplate(content, { title: 'Verification Code' }),
    text: `Verification Code: ${code}\n\nThis code expires in 10 minutes. Do not share it with anyone.`,
  });
}

/**
 * Send welcome email to new users
 */
export async function sendWelcomeEmail(email, userName, userType = 'student') {
  const dashboardUrl = `${FRONTEND_URL}/dashboard`;
  const helpUrl = `${FRONTEND_URL}/help`;

  const content = `
    <h2>Welcome to Gyandeep! 🎉</h2>
    <p>Hi ${userName},</p>
    <p>Welcome to <strong>Gyandeep AI Smart Classroom</strong>! Your account has been successfully created as a <strong>${userType}</strong>.</p>
    <p>Here's what you can do with Gyandeep:</p>
    <ul>
      <li>📚 Access your class schedules and subjects</li>
      <li>🎯 Mark attendance using face recognition</li>
      <li>📝 Participate in quizzes and earn XP</li>
      <li>📊 Track your progress and grades</li>
      <li>💬 Get help from our AI-powered assistant</li>
    </ul>
    <a href="${dashboardUrl}" class="button">Go to Dashboard</a>
    <div class="info">
      <strong>Need help getting started?</strong>
      <p>Visit our <a href="${helpUrl}">Help Center</a> or contact our support team.</p>
    </div>
  `;

  return sendEmail({
    to: email,
    subject: 'Welcome to Gyandeep - Your Smart Classroom Journey Begins!',
    html: generateEmailTemplate(content, { title: 'Welcome!' }),
    text: `Welcome to Gyandeep!\n\nHi ${userName}, your ${userType} account is ready. Visit ${dashboardUrl} to get started.`,
  });
}

/**
 * Send notification email
 */
export async function sendNotificationEmail(email, notification) {
  const { title, message, type = 'info', actionUrl, actionText } = notification;

  const typeColors = {
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
  };

  const content = `
    <h2>${title}</h2>
    <p>Hi there,</p>
    <p>${message}</p>
    ${actionUrl ? `<a href="${actionUrl}" class="button">${actionText || 'View Details'}</a>` : ''}
    <div class="info">
      <p>You can manage your notification preferences in your account settings.</p>
    </div>
  `;

  return sendEmail({
    to: email,
    subject: title,
    html: generateEmailTemplate(content, { title, headerColor: typeColors[type] || typeColors.info }),
    text: `${title}\n\n${message}\n\n${actionUrl ? `View: ${actionUrl}` : ''}`,
  });
}

/**
 * Send attendance notification
 */
export async function sendAttendanceNotification(email, attendanceData) {
  const { subject, date, status, className } = attendanceData;

  const statusColors = {
    present: '#10b981',
    absent: '#ef4444',
    late: '#f59e0b',
  };

  const content = `
    <h2>Attendance ${status === 'present' ? '✅' : status === 'absent' ? '❌' : '⚠️'}</h2>
    <p>Hi there,</p>
    <p>Your attendance for <strong>${subject}</strong> has been recorded:</p>
    <div style="background: ${statusColors[status] || '#6b7280'}20; border-left: 4px solid ${statusColors[status] || '#6b7280'}; padding: 15px; margin: 20px 0; border-radius: 4px;">
      <strong style="color: ${statusColors[status] || '#6b7280'}; text-transform: uppercase;">${status}</strong>
      <p style="margin: 5px 0 0 0; color: #374151;">${className} • ${date}</p>
    </div>
    <p>View your full attendance record in the dashboard.</p>
  `;

  return sendEmail({
    to: email,
    subject: `Attendance ${status} - ${subject}`,
    html: generateEmailTemplate(content, { title: 'Attendance Update' }),
    text: `Attendance Update\n\nSubject: ${subject}\nStatus: ${status}\nDate: ${date}\nClass: ${className}`,
  });
}

/**
 * Send bulk emails (admin only)
 */
export async function sendBulkEmails(emails, subject, content, options = {}) {
  const results = [];
  const errors = [];

  for (const email of emails) {
    try {
      const result = await sendEmail({
        to: email,
        subject,
        html: generateEmailTemplate(content, options),
      });
      results.push({ email, success: true, messageId: result.messageId });
    } catch (error) {
      errors.push({ email, error: error.message });
      results.push({ email, success: false, error: error.message });
    }
  }

  return {
    total: emails.length,
    successful: results.filter(r => r.success).length,
    failed: errors.length,
    results,
    errors,
  };
}

/**
 * Test email configuration
 */
export async function testEmailConfiguration() {
  const provider = initializeEmailService();

  return {
    provider: providerType,
    configured: providerType !== PROVIDERS.CONSOLE,
    sender: getSenderEmail(),
    support: getSupportEmail(),
    message: providerType === PROVIDERS.CONSOLE
      ? 'Email service not configured - using console fallback'
      : `Email service configured with ${providerType}`,
  };
}

export default {
  sendEmail,
  sendPasswordResetEmail,
  sendVerificationCode,
  sendWelcomeEmail,
  sendNotificationEmail,
  sendAttendanceNotification,
  sendBulkEmails,
  testEmailConfiguration,
  PROVIDERS,
};
