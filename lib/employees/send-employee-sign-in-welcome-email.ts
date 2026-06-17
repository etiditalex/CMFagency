import { fromEmail } from "@/lib/resend";
import { buildResendEmailHeaderHtml } from "@/lib/resend-email-header";
import { formatEmployeeEmailDateTime } from "@/lib/employees/utils";
import type { EmployeeAttendanceEventType } from "@/lib/employees/types";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function sendEmployeeSignInWelcomeEmail(params: {
  to: string;
  employeeName: string;
  businessName: string;
  occurredAt: string;
  employeeCode?: string | null;
  eventType: EmployeeAttendanceEventType;
}): Promise<boolean> {
  const resendApiKey = process.env.RESEND_API_KEY?.trim();
  const to = params.to.trim().toLowerCase();
  if (!resendApiKey || !to.includes("@")) return false;

  const isSignIn = params.eventType === "sign_in";
  const name = escapeHtml(params.employeeName.trim() || "Team member");
  const org = escapeHtml(params.businessName.trim() || "Your organisation");
  const when = escapeHtml(formatEmployeeEmailDateTime(params.occurredAt));
  const memberId = params.employeeCode?.trim()
    ? `<li><strong>Member ID:</strong> ${escapeHtml(params.employeeCode.trim())}</li>`
    : "";

  const base = (process.env.NEXT_PUBLIC_SITE_URL || "https://cmfagency.co.ke").replace(/\/$/, "");
  const signUpUrl = `${base}/fusion-xpress/smart-visitor-management/sign-up`;

  const html = isSignIn
    ? `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
${buildResendEmailHeaderHtml({ subtitle: "Fusion Xpress · Employee attendance" })}
<div style="background: #f9fafb; padding: 24px; border-radius: 0 0 10px 10px; text-align: left;">
<p style="margin: 0 0 16px; font-size: 16px;"><strong>Welcome, ${name}!</strong></p>
<p style="margin: 0 0 16px;">You have successfully signed in at <strong>${org}</strong>.</p>
<ul style="margin: 0 0 20px; padding-left: 20px;">
<li><strong>Date &amp; time:</strong> ${when}</li>
${memberId}
</ul>
<p style="margin: 0 0 8px;">
<a href="${escapeHtml(signUpUrl)}" style="display: inline-block; background: #2ca57c; color: #ffffff; font-weight: 700; padding: 12px 24px; text-decoration: none; border-radius: 6px;">SIGN UP NOW</a>
</p>
<p style="margin: 24px 0 0; font-size: 12px; color: #6b7280;">
You received this because you signed in using Fusion Xpress Smart Visitor Management.
</p>
</div>
</body>
</html>`
    : `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
${buildResendEmailHeaderHtml({ subtitle: "Fusion Xpress · Employee attendance" })}
<div style="background: #f9fafb; padding: 24px; border-radius: 0 0 10px 10px; text-align: left;">
<p style="margin: 0 0 16px; font-size: 16px;"><strong>Hello ${name},</strong></p>
<p style="margin: 0 0 16px;">You have signed out from <strong>${org}</strong>.</p>
<ul style="margin: 0 0 20px; padding-left: 20px;">
<li><strong>Date &amp; time:</strong> ${when}</li>
${memberId}
</ul>
<p style="margin: 24px 0 0; font-size: 12px; color: #6b7280;">
You received this because you signed out using Fusion Xpress Smart Visitor Management.
</p>
</div>
</body>
</html>`;

  const subject = isSignIn
    ? `Welcome — signed in at ${params.businessName}`
    : `Signed out from ${params.businessName}`;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: fromEmail,
        to: [to],
        subject,
        html,
      }),
    });
    if (!res.ok) {
      const errBody = (await res.json().catch(() => ({}))) as { message?: string };
      console.warn("[sendEmployeeSignInWelcomeEmail]", errBody.message ?? res.status);
      return false;
    }
    return true;
  } catch (e) {
    console.warn("[sendEmployeeSignInWelcomeEmail]", e instanceof Error ? e.message : e);
    return false;
  }
}
