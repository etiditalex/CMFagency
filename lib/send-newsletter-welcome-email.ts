import { fromEmail } from "@/lib/resend";
import { buildResendEmailHeaderHtml } from "@/lib/resend-email-header";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Sends a thank-you email after someone subscribes to the public newsletter (Resend).
 */
export async function sendNewsletterWelcomeEmail(params: {
  to: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    return { ok: false, error: "RESEND_API_KEY not configured" };
  }

  const to = params.to.trim().toLowerCase();
  if (!to || !EMAIL_RE.test(to) || to.length > 254) {
    return { ok: false, error: "Invalid recipient email" };
  }

  const base = (process.env.NEXT_PUBLIC_SITE_URL || "https://cmfagency.co.ke").replace(/\/$/, "");
  const blogsUrl = `${base}/blogs`;
  const contactUrl = `${base}/contact`;

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: Arial, Helvetica, sans-serif; line-height: 1.6; color: #1f2937; margin: 0; padding: 0; background: #f3f4f6;">
  <div style="max-width: 600px; margin: 0 auto; padding: 24px 16px;">
    ${buildResendEmailHeaderHtml({
      primaryTitle: "Changer Fusions",
      subtitle: "Newsletter subscription",
    })}
    <div style="background: #ffffff; padding: 28px 24px 32px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb; border-top: none;">
      <p style="margin: 0 0 16px; font-size: 16px;">Thank you for subscribing to our newsletter.</p>
      <p style="margin: 0 0 20px; font-size: 15px; color: #4b5563;">
        We’re glad to have you with us. From time to time you’ll hear from us with:
      </p>
      <ul style="margin: 0 0 24px; padding-left: 20px; color: #374151; font-size: 15px;">
        <li style="margin-bottom: 10px;"><strong>News &amp; updates</strong> — company news and industry highlights</li>
        <li style="margin-bottom: 10px;"><strong>Blog &amp; insights</strong> — marketing, events, branding, and growth tips</li>
        <li style="margin-bottom: 10px;"><strong>Events</strong> — announcements and reminders for what we’re hosting or supporting</li>
        <li style="margin-bottom: 0;"><strong>Offers &amp; opportunities</strong> — promotions, resources, and relevant opportunities when we have them</li>
      </ul>
      <div style="text-align: center; margin: 0 0 24px;">
        <a href="${escapeHtml(blogsUrl)}" style="display: inline-block; background: #1a4f8c; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 15px; padding: 12px 24px; border-radius: 8px;">Read our latest articles</a>
      </div>
      <p style="margin: 0; font-size: 14px; color: #6b7280;">
        Questions? Visit <a href="${escapeHtml(contactUrl)}" style="color: #1a4f8c;">our contact page</a> or reply to this email.
      </p>
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
      <p style="margin: 0; font-size: 12px; color: #9ca3af;">
        You received this email because you subscribed to the Changer Fusions newsletter on our website.
      </p>
    </div>
  </div>
</body>
</html>`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: fromEmail,
      to,
      subject: "You're subscribed — Changer Fusions newsletter",
      html,
    }),
  });

  if (!res.ok) {
    const errBody = (await res.json().catch(() => ({}))) as { message?: string; error?: string };
    return { ok: false, error: errBody.message ?? errBody.error ?? `Resend HTTP ${res.status}` };
  }

  return { ok: true };
}
