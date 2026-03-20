import { fromEmail } from "@/lib/resend";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Sends the applicant their CMF Agency ID after a successful submission (Resend).
 */
export async function sendApplicationConfirmationEmail(params: {
  to: string;
  firstName: string;
  cmfAgencyId: string;
  jobPosition?: string;
  /** Role did not match any opening in the job catalog */
  jobOpeningUnlisted?: boolean;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    return { ok: false, error: "RESEND_API_KEY not configured" };
  }

  const to = params.to.trim();
  if (!to || !to.includes("@")) {
    return { ok: false, error: "Invalid recipient email" };
  }

  const base = (process.env.NEXT_PUBLIC_SITE_URL || "https://cmfagency.co.ke").replace(/\/$/, "");
  const trackLink = `${base}/track-application`;
  const first = escapeHtml(params.firstName.trim() || "there");
  const id = escapeHtml(params.cmfAgencyId);
  const position = params.jobPosition?.trim()
    ? `<p style="margin: 0 0 16px;"><strong>Position applied for:</strong> ${escapeHtml(params.jobPosition.trim())}</p>`
    : "";

  const unlisted =
    params.jobOpeningUnlisted && params.jobPosition?.trim()
      ? `<div style="background: #fffbeb; border: 1px solid #fcd34d; border-radius: 8px; padding: 16px; margin: 0 0 20px;">
          <p style="margin: 0; color: #92400e;"><strong>No matching open role</strong></p>
          <p style="margin: 8px 0 0; color: #78350f;">We do not currently have an opening that matches &ldquo;${escapeHtml(params.jobPosition.trim())}&rdquo;. Your application is on file with your CMF Agency ID below; you may apply again when a suitable role is advertised.</p>
        </div>`
      : params.jobOpeningUnlisted
        ? `<div style="background: #fffbeb; border: 1px solid #fcd34d; border-radius: 8px; padding: 16px; margin: 0 0 20px;">
          <p style="margin: 0; color: #92400e;"><strong>No matching open role</strong></p>
          <p style="margin: 8px 0 0; color: #78350f;">We do not currently have a listed opening for the role you selected. You may try again in the future when we advertise new positions.</p>
        </div>`
        : "";

  const html = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 24px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">CMF Agency</h1>
        </div>
        <div style="background: #f9fafb; padding: 24px; border-radius: 0 0 10px 10px;">
          <h2 style="color: #111827; margin-top: 0;">Application received</h2>
          <p>Hello ${first},</p>
          <p>Thank you for applying. Your application and documents are stored securely. Our team will review your submission in the dashboard.</p>
          ${position}
          ${unlisted}
          <p style="margin: 0 0 8px;"><strong>Your CMF Agency ID</strong> (save this to track your status):</p>
          <div style="background: white; border: 2px solid #667eea; border-radius: 8px; padding: 16px; text-align: center; margin: 0 0 20px;">
            <p style="font-size: 22px; font-weight: bold; letter-spacing: 2px; color: #111827; margin: 0; font-family: monospace;">${id}</p>
          </div>
          <p style="margin: 0 0 12px;">Track your application anytime:</p>
          <p style="margin: 0 0 20px;"><a href="${escapeHtml(trackLink)}" style="color: #667eea; font-weight: 600;">${escapeHtml(trackLink)}</a></p>
          <p style="color: #6b7280; font-size: 12px;">CMF Agency / Changer Fusions</p>
        </div>
      </body>
      </html>
    `;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: fromEmail,
      to,
      subject: `Your CMF Agency application — ${params.cmfAgencyId}`,
      html,
    }),
  });

  if (!res.ok) {
    const errBody = (await res.json().catch(() => ({}))) as { message?: string; error?: string };
    return { ok: false, error: errBody.message ?? errBody.error ?? `Resend HTTP ${res.status}` };
  }

  return { ok: true };
}
