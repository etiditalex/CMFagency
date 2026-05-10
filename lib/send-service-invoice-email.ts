import { resend, fromEmail } from "./resend";
import { isSmtpConfigured, sendEmailViaSmtp } from "./email-smtp";

function baseUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://cmfagency.co.ke").replace(/\/$/, "");
}

export async function sendServiceInvoiceCreatedEmail(params: {
  to: string;
  customerName: string;
  invoiceLabel: string;
  packageTitle: string;
  amountKes: number;
  accessToken: string;
  /** ISO date string `YYYY-MM-DD` or null */
  dueDate?: string | null;
}): Promise<{ ok: boolean; error?: string }> {
  const payUrl = `${baseUrl()}/invoice/${encodeURIComponent(params.accessToken)}`;
  const subject = `Invoice ${params.invoiceLabel} — Changer Fusions`;
  const amountFmt = `KSh ${params.amountKes.toLocaleString("en-KE")}`;
  const dueLine =
    params.dueDate && /^\d{4}-\d{2}-\d{2}$/.test(params.dueDate)
      ? new Date(params.dueDate + "T12:00:00").toLocaleDateString("en-KE", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      : null;

  const html = `
<!DOCTYPE html>
<html><body style="font-family:system-ui,sans-serif;line-height:1.5;color:#111827;padding:24px;max-width:560px;">
  <p>Hi ${escapeHtml(params.customerName)},</p>
  <p>Thank you for choosing <strong>Changer Fusions</strong>. Your proforma invoice is attached below as a summary — the same details are on your secure payment page.</p>
  <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin:20px 0;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
    <tr style="background:#f9fafb;"><td style="padding:10px 14px;font-size:13px;color:#6b7280;">Invoice number</td><td style="padding:10px 14px;font-weight:700;text-align:right;">${escapeHtml(params.invoiceLabel)}</td></tr>
    <tr><td style="padding:10px 14px;font-size:13px;color:#6b7280;border-top:1px solid #e5e7eb;">Service</td><td style="padding:10px 14px;text-align:right;border-top:1px solid #e5e7eb;">${escapeHtml(params.packageTitle)}</td></tr>
    <tr style="background:#f9fafb;"><td style="padding:10px 14px;font-size:13px;color:#6b7280;border-top:1px solid #e5e7eb;">Amount (monthly)</td><td style="padding:10px 14px;font-weight:700;text-align:right;border-top:1px solid #e5e7eb;">${amountFmt}</td></tr>
    ${
      dueLine
        ? `<tr><td style="padding:10px 14px;font-size:13px;color:#6b7280;border-top:1px solid #e5e7eb;">Due date</td><td style="padding:10px 14px;text-align:right;border-top:1px solid #e5e7eb;">${escapeHtml(dueLine)}</td></tr>`
        : ""
    }
  </table>
  <p style="margin:24px 0;">
    <a href="${payUrl}" style="display:inline-block;background:#1d8a63;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700;">Open invoice &amp; pay</a>
  </p>
  <p style="font-size:14px;color:#6b7280;">Pay securely with <strong>card / mobile money (Paystack)</strong> or <strong>M-Pesa</strong> on the invoice page.</p>
  <p style="font-size:13px;color:#9ca3af;margin-top:24px;">— Changer Fusions · Mombasa, Kenya</p>
</body></html>`;

  return sendHtmlEmail(params.to, subject, html);
}

export async function sendServiceInvoicePaidEmail(params: {
  to: string;
  customerName: string;
  invoiceLabel: string;
  packageTitle: string;
  amountKes: number;
  reference: string;
}): Promise<{ ok: boolean; error?: string }> {
  const subject = `Payment received — ${params.invoiceLabel} — Changer Fusions`;
  const amountFmt = `KSh ${params.amountKes.toLocaleString("en-KE")}`;
  const html = `
<!DOCTYPE html>
<html><body style="font-family:system-ui,sans-serif;line-height:1.5;color:#111827;padding:24px;">
  <p>Hi ${escapeHtml(params.customerName)},</p>
  <p>We&apos;ve received your payment for <strong>${escapeHtml(params.packageTitle)}</strong> (${amountFmt}).</p>
  <p><strong>Reference:</strong> ${escapeHtml(params.reference)}</p>
  <p>Our team will follow up with next steps for your SEO subscription.</p>
  <p style="margin-top:24px;">— Changer Fusions</p>
</body></html>`;
  return sendHtmlEmail(params.to, subject, html);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function sendHtmlEmail(to: string, subject: string, html: string): Promise<{ ok: boolean; error?: string }> {
  if (isSmtpConfigured()) {
    try {
      const smtpRes = await sendEmailViaSmtp({ to, subject, html, from: fromEmail });
      if (!smtpRes.ok) return { ok: false, error: smtpRes.error };
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "smtp_failed" };
    }
  }
  if (!resend) {
    return { ok: false, error: "email_not_configured" };
  }
  try {
    await resend.emails.send({ from: fromEmail, to, subject, html });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "resend_failed" };
  }
}
