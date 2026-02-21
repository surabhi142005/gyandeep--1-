import nodemailer from 'nodemailer'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })
dotenv.config()

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT) || 587,
  secure: Number(process.env.SMTP_PORT) === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
})

const fromAddress = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@gyandeep.com'

export async function sendEmail({ to, subject, html, text }) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('[EmailService] SMTP not configured — logging email instead')
    console.log(`[EmailService] To: ${to} | Subject: ${subject}`)
    console.log(`[EmailService] Body: ${text || html}`)
    return { accepted: [to], messageId: 'local-dev-' + Date.now() }
  }

  const info = await transporter.sendMail({
    from: `"Gyandeep" <${fromAddress}>`,
    to,
    subject,
    html,
    text
  })

  console.log(`[EmailService] Sent to ${to}: ${info.messageId}`)
  return info
}

export async function sendOTPEmail(to, code, purpose = 'verification') {
  const purposeText = purpose === 'password_reset'
    ? 'reset your password'
    : 'verify your email'

  return sendEmail({
    to,
    subject: `Gyandeep - Your ${purpose === 'password_reset' ? 'Password Reset' : 'Verification'} Code`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #4F46E5; margin: 0;">Gyandeep</h1>
          <p style="color: #6B7280; margin-top: 4px;">Educational Platform</p>
        </div>
        <div style="background: #F9FAFB; border-radius: 12px; padding: 24px; text-align: center;">
          <p style="color: #374151; font-size: 16px; margin-top: 0;">
            Use the following code to ${purposeText}:
          </p>
          <div style="background: #4F46E5; color: white; font-size: 32px; font-weight: bold; letter-spacing: 8px; padding: 16px 24px; border-radius: 8px; display: inline-block; margin: 16px 0;">
            ${code}
          </div>
          <p style="color: #6B7280; font-size: 14px; margin-bottom: 0;">
            This code expires in 10 minutes. Do not share it with anyone.
          </p>
        </div>
        <p style="color: #9CA3AF; font-size: 12px; text-align: center; margin-top: 24px;">
          If you did not request this, please ignore this email.
        </p>
      </div>
    `,
    text: `Your Gyandeep ${purpose === 'password_reset' ? 'password reset' : 'verification'} code is: ${code}. This code expires in 10 minutes.`
  })
}

export async function sendEmailVerification(to, code) {
  return sendOTPEmail(to, code, 'verification')
}

export async function sendPasswordResetEmail(to, code) {
  return sendOTPEmail(to, code, 'password_reset')
}
