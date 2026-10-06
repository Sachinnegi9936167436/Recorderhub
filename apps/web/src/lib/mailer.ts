import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';

export function ensureEnvLoaded() {
  const candidatePaths = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), '.env.local'),
    path.resolve(process.cwd(), 'apps/web/.env'),
    path.resolve(process.cwd(), 'apps/web/.env.local'),
    path.resolve(process.cwd(), '../.env'),
    path.resolve(process.cwd(), '../.env.local'),
    path.resolve(process.cwd(), '../../.env'),
    path.resolve(process.cwd(), '../../.env.local'),
  ];

  for (const envPath of candidatePaths) {
    try {
      if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf8');
        content.split('\n').forEach((line) => {
          const trimmed = line.trim();
          if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
            const idx = trimmed.indexOf('=');
            const key = trimmed.substring(0, idx).trim();
            const val = trimmed.substring(idx + 1).trim().replace(/^['"]|['"]$/g, '');
            if (!process.env[key] && val) {
              process.env[key] = val;
            }
          }
        });
      }
    } catch {}
  }
}

export interface EmailAttachment {
  filename: string;
  content: Buffer | string;
  contentType?: string;
}

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  attachments?: EmailAttachment[];
}

/**
 * Creates and returns a Nodemailer transporter configured for Zoho Mail
 */
export function getZohoTransporter() {
  ensureEnvLoaded();
  const host = process.env.ZOHO_SMTP_HOST || 'smtppro.zoho.in';
  const port = Number(process.env.ZOHO_SMTP_PORT || 465);
  const user = process.env.ZOHO_EMAIL;
  const pass = process.env.ZOHO_PASSWORD;

  if (!user || !pass) {
    throw new Error('ZOHO_EMAIL or ZOHO_PASSWORD environment variables are not configured in .env');
  }

  const isSecure = port === 465;

  return nodemailer.createTransport({
    host,
    port,
    secure: isSecure, // true for port 465, false for 587
    auth: {
      user,
      pass,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });
}

/**
 * Verifies Zoho SMTP connection
 */
export async function verifyZohoConnection(): Promise<boolean> {
  const transporter = getZohoTransporter();
  await transporter.verify();
  return true;
}

/**
 * Sends an email using Zoho Mail transporter
 */
export async function sendMail(options: SendEmailOptions) {
  const transporter = getZohoTransporter();
  const senderEmail = process.env.ZOHO_EMAIL;
  const senderName = process.env.ZOHO_SENDER_NAME || 'RecordHub Reports';

  const mailOptions = {
    from: `"${senderName}" <${senderEmail}>`,
    to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
    subject: options.subject,
    text: options.text || '',
    html: options.html,
    attachments: options.attachments?.map((att) => ({
      filename: att.filename,
      content: att.content,
      contentType: att.contentType,
    })),
  };

  const info = await transporter.sendMail(mailOptions);
  return info;
}
