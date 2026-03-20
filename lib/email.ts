/**
 * lib/email.ts
 * Email service using Resend
 */

const RESEND_API_KEY = import.meta.env.VITE_RESEND_API_KEY || import.meta.env.RESEND_API_KEY;
const FROM_EMAIL = import.meta.env.VITE_FROM_EMAIL || import.meta.env.FROM_EMAIL || 'Gyandeep <noreply@gyandeep.edu>';
const EMAIL_FROM_SUPPORT = import.meta.env.VITE_EMAIL_FROM_SUPPORT || 'support@gyandeep.edu';

interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

async function sendEmail(options: EmailOptions): Promise<{ success: boolean; id?: string; error?: string }> {
  if (!RESEND_API_KEY) {
    console.warn('Resend API key not configured. Email not sent.');
    return { success: false, error: 'Email service not configured' };
  }

  const recipients = Array.isArray(options.to) ? options.to : [options.to];

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: recipients,
        subject: options.subject,
        html: options.html,
        text: options.text || options.html.replace(/<[^>]*>/g, ''),
        reply_to: options.replyTo || EMAIL_FROM_SUPPORT,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `Email error: ${response.status}`);
    }

    const data = await response.json();
    return { success: true, id: data.id };
  } catch (error) {
    console.error('Email send error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function sendPasswordResetEmail(
  email: string,
  code: string,
  expiresInMinutes: number = 15
): Promise<{ success: boolean; error?: string }> {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
        .code { background: #e5e7eb; padding: 15px 30px; font-size: 32px; font-weight: bold; letter-spacing: 8px; text-align: center; border-radius: 8px; margin: 20px 0; }
        .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Gyandeep</h1>
          <p>Password Reset Request</p>
        </div>
        <div class="content">
          <p>Hello,</p>
          <p>We received a request to reset your password. Use the following code to reset your password:</p>
          <div class="code">${code}</div>
          <p>This code will expire in <strong>${expiresInMinutes} minutes</strong>.</p>
          <p>If you didn't request a password reset, you can safely ignore this email.</p>
        </div>
        <div class="footer">
          <p>Gyandeep - AI Smart Classroom</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: 'Gyandeep - Password Reset Code',
    html,
  });
}

export async function sendEmailVerificationEmail(
  email: string,
  code: string
): Promise<{ success: boolean; error?: string }> {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
        .code { background: #e5e7eb; padding: 15px 30px; font-size: 32px; font-weight: bold; letter-spacing: 8px; text-align: center; border-radius: 8px; margin: 20px 0; }
        .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Gyandeep</h1>
          <p>Verify Your Email</p>
        </div>
        <div class="content">
          <p>Hello,</p>
          <p>Thank you for registering with Gyandeep. Please verify your email address by entering this code:</p>
          <div class="code">${code}</div>
          <p>This code will expire in <strong>1 hour</strong>.</p>
        </div>
        <div class="footer">
          <p>Gyandeep - AI Smart Classroom</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: 'Gyandeep - Email Verification',
    html,
  });
}

export async function sendWelcomeEmail(
  email: string,
  name: string,
  role: string
): Promise<{ success: boolean; error?: string }> {
  const roleText = role === 'student' ? 'student' : role === 'teacher' ? 'teacher' : 'user';
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
        .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Welcome to Gyandeep!</h1>
        </div>
        <div class="content">
          <p>Hello <strong>${name}</strong>,</p>
          <p>Your ${roleText} account has been created successfully.</p>
          <p>Gyandeep is an AI-powered smart classroom platform that helps you:</p>
          <ul>
            <li>Track attendance automatically</li>
            <li>Take interactive quizzes</li>
            <li>Access centralized notes</li>
            <li>Get AI-powered learning insights</li>
          </ul>
          <a href="${import.meta.env.VITE_APP_URL || 'https://gyandeep.edu'}" class="button">Get Started</a>
        </div>
        <div class="footer">
          <p>Gyandeep - AI Smart Classroom</p>
          <p>If you have any questions, contact us at ${EMAIL_FROM_SUPPORT}</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: 'Welcome to Gyandeep!',
    html,
  });
}

export async function sendTicketNotificationEmail(
  email: string,
  ticketId: string,
  subject: string,
  status: string
): Promise<{ success: boolean; error?: string }> {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #f59e0b; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
        .status { display: inline-block; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: bold; }
        .status-open { background: #fef3c7; color: #92400e; }
        .status-resolved { background: #d1fae5; color: #065f46; }
        .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Support Ticket Update</h1>
        </div>
        <div class="content">
          <p>Your support ticket has been updated:</p>
          <p><strong>Ticket ID:</strong> ${ticketId}</p>
          <p><strong>Subject:</strong> ${subject}</p>
          <p><strong>Status:</strong> <span class="status ${status === 'resolved' ? 'status-resolved' : 'status-open'}">${status.toUpperCase()}</span></p>
          <p>You can view and respond to your ticket from your Gyandeep dashboard.</p>
        </div>
        <div class="footer">
          <p>Gyandeep Support Team</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: `Gyandeep Support - Ticket ${ticketId} Updated`,
    html,
  });
}

export function isEmailConfigured(): boolean {
  return !!RESEND_API_KEY;
}

export default {
  sendEmail,
  sendPasswordResetEmail,
  sendEmailVerificationEmail,
  sendWelcomeEmail,
  sendTicketNotificationEmail,
  isEmailConfigured,
};
