/**
 * Resend SMTP transport for sending emails.
 * Uses Resend's SMTP credentials when RESEND_USE_SMTP=true.
 *
 * Resend SMTP docs: https://resend.com/docs/send-with-smtp
 * - Host: smtp.resend.com
 * - Username: resend
 * - Password: YOUR_API_KEY (use RESEND_API_KEY)
 * - Port: 465 (SMTPS), 587 (STARTTLS), 25, 2465, 2587
 */

import nodemailer from "nodemailer";

const apiKey = process.env.RESEND_API_KEY;
const useSmtp = process.env.RESEND_USE_SMTP === "true" || process.env.RESEND_USE_SMTP === "1";
const port = parseInt(process.env.RESEND_SMTP_PORT ?? "465", 10) || 465;
const secure = port === 465 || port === 2465;

function createTransport(): nodemailer.Transporter | null {
  if (!useSmtp || !apiKey?.trim()) return null;
  return nodemailer.createTransport({
    host: "smtp.resend.com",
    port,
    secure,
    auth: {
      user: "resend",
      pass: apiKey.trim(),
    },
    connectionTimeout: 8_000,
    greetingTimeout: 8_000,
    socketTimeout: 15_000,
  });
}

let cachedTransport: nodemailer.Transporter | null | undefined = undefined;

export function getResendSmtpTransport(): nodemailer.Transporter | null {
  if (cachedTransport === undefined) cachedTransport = createTransport();
  return cachedTransport;
}

export function isSmtpConfigured(): boolean {
  return useSmtp && !!apiKey?.trim();
}

export type SmtpAttachment = {
  filename: string;
  content: Buffer | string;
  cid?: string;
};

export type SendEmailOptions = {
  to: string;
  subject: string;
  html: string;
  from: string;
  /** Optional inline attachments (e.g. logo with cid for header) */
  attachments?: SmtpAttachment[];
};

export async function sendEmailViaSmtp(
  options: SendEmailOptions
): Promise<{ ok: boolean; error?: string }> {
  const transport = getResendSmtpTransport();
  if (!transport) {
    return { ok: false, error: "Resend SMTP not configured (RESEND_USE_SMTP and RESEND_API_KEY)" };
  }
  try {
    await Promise.race([
      transport.sendMail({
        from: options.from,
        to: options.to,
        subject: options.subject,
        html: options.html,
        attachments: options.attachments?.map((a) => ({
          filename: a.filename,
          content: a.content,
          cid: a.cid,
        })),
      }),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("SMTP send timed out")), 18_000);
      }),
    ]);
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return { ok: false, error: msg };
  }
}
