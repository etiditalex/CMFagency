import { fromEmail } from "@/lib/resend";
import { buildResendEmailHeaderHtml } from "@/lib/resend-email-header";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatVisitDate(ymd: string): string {
  const d = new Date(`${ymd}T12:00:00`);
  if (Number.isNaN(d.getTime())) return ymd;
  return d.toLocaleDateString("en-KE", {
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export async function sendVisitorPreRegisterEmail(params: {
  to: string;
  visitorName: string;
  venueName: string;
  visitDate: string;
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
  const when = escapeHtml(formatVisitDate(params.visitDate));
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
<p style="margin: 0 0 16px;">Your visit is pre-registered with Fusion Xpress Smart Visitor Management.</p>
<p style="margin: 0 0 16px;">When you arrive, scan the reception QR code with <strong>this same phone</strong>. We use the device and contact number from this registration to verify your scan.</p>
<ul style="margin: 0 0 20px; padding-left: 20px;">
<li><strong>Venue:</strong> ${venue}</li>
<li><strong>Visitor name:</strong> ${name}</li>
<li><strong>Visit date:</strong> ${when}</li>
${industry}
</ul>
<h3 style="color: #1a4f8c; margin: 24px 0 12px; font-size: 16px;">Security and privacy</h3>
<p style="margin: 0 0 12px; font-size: 14px; color: #4b5563;">
Your information is stored securely for the host organisation&apos;s visitor management records and is not shared beyond what is required to operate the service.
</p>
<p style="margin: 0 0 20px; font-size: 14px;">
<a href="${escapeHtml(privacyUrl)}" style="color: #1e58ca; font-weight: 600;">View our privacy policy</a>
</p>
<p style="margin: 24px 0 0; font-size: 12px; color: #6b7280;">
You received this email because you pre-registered and requested a confirmation email. Changer Fusions · CMF Agency
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
      subject: `Pre-registration confirmed — ${params.venueName}`,
      html,
    }),
  });

  if (!res.ok) {
    const errBody = (await res.json().catch(() => ({}))) as { message?: string };
    return { ok: false, error: errBody.message ?? "Failed to send email" };
  }

  return { ok: true };
}
