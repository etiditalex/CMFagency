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
}): Promise<{ ok: boolean; error?: string }> {
  const payUrl = `${baseUrl()}/invoice/${encodeURIComponent(params.accessToken)}`;
  const subject = `Proforma invoice ${params.invoiceLabel} — Changer Fusions`;
  const amountFmt = `KSh ${params.amountKes.toLocaleString("en-KE")}`;

  const html = `
<!DOCTYPE html>
<html><body style="font-family:system-ui,sans-serif;line-height:1.5;color:#111827;padding:24px;">
  <p>Hi ${escapeHtml(params.customerName)},</p>
  <p>Thank you for choosing <strong>Changer Fusions</strong>. Your proforma invoice is ready.</p>
  <p><strong>${escapeHtml(params.packageTitle)}</strong><br/>${amountFmt} / month</p>
  <p style="margin:24px 0;">
    <a href="${payUrl}" style="display:inline-block;background:#1d8a63;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700;">View invoice &amp; pay</a>
  </p>
  <p style="font-size:14px;color:#6b7280;">You can pay securely with <strong>card / mobile money (Paystack)</strong> or <strong>M-Pesa</strong> from the invoice page.</p>
  <p style="font-size:13px;color:#9ca3af;">Invoice ref: ${escapeHtml(params.invoiceLabel)}</p>
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
