import { fromEmail } from "@/lib/resend";
import { buildResendEmailHeaderHtml } from "@/lib/resend-email-header";
import { formatCheckInEmailDateTime } from "@/lib/visitors/format-check-in-display";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function sendVisitorCheckInConfirmationEmail(params: {
  to: string;
  visitorName: string;
  venueName: string;
  checkedInAt: string;
  industryLabel?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    return { ok: false, error: "RESEND_API_KEY not configured" };
  }

  const to = params.to.trim();
  if (!to || !to.includes("@")) {
    return { ok: false, error: "Invalid recipient email" };
  }

  const name = escapeHtml(params.visitorName.trim() || "Guest");
  const venue = escapeHtml(params.venueName.trim() || "Reception");
  const when = escapeHtml(formatCheckInEmailDateTime(params.checkedInAt));
  const industry = params.industryLabel?.trim()
    ? `<li><strong>Industry:</strong> ${escapeHtml(params.industryLabel)}</li>`
    : "";

  const base = (process.env.NEXT_PUBLIC_SITE_URL || "https://cmfagency.co.ke").replace(/\/$/, "");
  const privacyUrl = `${base}/privacy`;

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
${buildResendEmailHeaderHtml({ subtitle: "Fusion Xpress · Smart Visitor Management" })}
<div style="background: #f9fafb; padding: 24px; border-radius: 0 0 10px 10px; text-align: left;">
<p style="margin: 0 0 16px; font-size: 16px;"><strong>Hello ${name},</strong></p>
<p style="margin: 0 0 16px;">Thank you for checking in with Fusion Xpress Smart Visitor Management!</p>
<p style="margin: 0 0 16px;">This email confirms your check-in details:</p>
<ul style="margin: 0 0 20px; padding-left: 20px;">
<li><strong>Venue:</strong> ${venue}</li>
<li><strong>Visitor name:</strong> ${name}</li>
<li><strong>Date &amp; time:</strong> ${when}</li>
${industry}
</ul>
<h3 style="color: #1a4f8c; margin: 24px 0 12px; font-size: 16px;">Security and privacy</h3>
<p style="margin: 0 0 12px; font-size: 14px; color: #4b5563;">
Your information is stored securely for the host organisation&apos;s visitor management records and is not shared beyond what is required to operate the service.
</p>
<p style="margin: 0 0 20px; font-size: 14px;">
<a href="${escapeHtml(privacyUrl)}" style="color: #1e58ca; font-weight: 600;">View our privacy policy</a>
</p>
<h3 style="color: #1a4f8c; margin: 24px 0 12px; font-size: 16px;">What is Fusion Xpress?</h3>
<p style="margin: 0 0 16px; font-size: 14px; color: #4b5563;">
Fusion Xpress Smart Visitor Management helps businesses collect and manage guest check-ins with QR codes, reception kiosks, and real-time visitor records.
</p>
<p style="margin: 0 0 8px;">
<a href="${escapeHtml(`${base}/fusion-xpress/smart-visitor-management/sign-up`)}" style="display: inline-block; background: #2ca57c; color: #ffffff; font-weight: 700; padding: 12px 24px; text-decoration: none; border-radius: 6px;">SIGN UP NOW</a>
</p>
<p style="margin: 24px 0 0; font-size: 12px; color: #6b7280;">
You received this email because you checked in and requested a confirmation email. Changer Fusions · CMF Agency
</p>
</div>
</body>
</html>`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: fromEmail,
      to,
      subject: `Check-in confirmed — ${params.venueName}`,
      html,
    }),
  });

  if (!res.ok) {
    const errBody = (await res.json().catch(() => ({}))) as { message?: string };
    return { ok: false, error: errBody.message ?? "Failed to send email" };
  }

  return { ok: true };
}
