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

export async function sendEmployeeAttendanceNotificationEmail(params: {
  to: string[];
  employeeName: string;
  department: string;
  businessName: string;
  eventType: EmployeeAttendanceEventType;
  occurredAt: string;
  deviceLabel: string;
  /** Excel attendance register attached to the email (no login required to open). */
  registerAttachment?: { filename: string; contentBase64: string } | null;
  /** Optional public link to re-download the register from email on mobile. */
  registerDownloadUrl?: string | null;
  registerDayKey?: string | null;
}): Promise<void> {
  const resendApiKey = process.env.RESEND_API_KEY?.trim();
  if (!resendApiKey) return;

  const recipients = params.to
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.includes("@"));
  if (recipients.length === 0) return;

  const isSignIn = params.eventType === "sign_in";
  const action = isSignIn ? "signed in to work" : "signed out from work";
  const subjectAction = isSignIn ? "Signed in" : "Signed out";

  const name = escapeHtml(params.employeeName.trim() || "Staff member");
  const dept = escapeHtml(params.department.trim() || "—");
  const org = escapeHtml(params.businessName.trim() || "Your organisation");
  const when = escapeHtml(formatEmployeeEmailDateTime(params.occurredAt));
  const device = escapeHtml(params.deviceLabel.trim() || "Unknown device");

  const base = (process.env.NEXT_PUBLIC_SITE_URL || "https://cmfagency.co.ke").replace(/\/$/, "");
  const dashboardUrl = `${base}/dashboard/visitor-management/employees`;
  const registerDay = params.registerDayKey ? escapeHtml(params.registerDayKey) : "";
  const downloadUrl = params.registerDownloadUrl?.trim() ?? "";
  const registerBlock =
    params.registerAttachment || downloadUrl
      ? `<p style="margin: 0 0 16px; padding: 14px; background: #ecfdf5; border-radius: 8px; border: 1px solid #a7f3d0;">
<strong>Today's attendance register</strong>${registerDay ? ` (${registerDay})` : ""} is attached to this email as an Excel file — no login required.
${downloadUrl ? `<br><br><a href="${escapeHtml(downloadUrl)}" style="color: #047857; font-weight: 700;">Download register again</a> (link valid 7 days)` : ""}
</p>`
      : "";

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
${buildResendEmailHeaderHtml({ subtitle: "Fusion Xpress · Employee attendance" })}
<div style="background: #f9fafb; padding: 24px; border-radius: 0 0 10px 10px; text-align: left;">
<p style="margin: 0 0 16px; font-size: 16px;"><strong>Staff attendance update</strong></p>
<p style="margin: 0 0 16px;">
<strong>${name}</strong> has <strong>${escapeHtml(action)}</strong> at <strong>${org}</strong>.
</p>
<ul style="margin: 0 0 20px; padding-left: 20px;">
<li><strong>Department:</strong> ${dept}</li>
<li><strong>Event:</strong> ${escapeHtml(subjectAction)}</li>
<li><strong>Date &amp; time:</strong> ${when}</li>
<li><strong>Device:</strong> ${device}</li>
</ul>
${registerBlock}
<p style="margin: 0 0 16px;">
<a href="${escapeHtml(dashboardUrl)}" style="display: inline-block; background: #2ca57c; color: #ffffff; font-weight: 700; padding: 12px 24px; text-decoration: none; border-radius: 6px;">View employee dashboard</a>
</p>
<p style="margin: 24px 0 0; font-size: 12px; color: #6b7280;">
You received this because you are listed as an organisation director or account owner for Fusion Xpress Visitor Management.
</p>
${"</"}div>
</body>
</html>`;

  try {
    const attachments = params.registerAttachment
      ? [{ filename: params.registerAttachment.filename, content: params.registerAttachment.contentBase64 }]
      : undefined;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: fromEmail,
        to: recipients,
        subject: `${subjectAction}: ${params.employeeName} — ${params.businessName}`,
        html,
        ...(attachments ? { attachments } : {}),
      }),
    });
    if (!res.ok) {
      const errBody = (await res.json().catch(() => ({}))) as { message?: string };
      console.warn(
        "[sendEmployeeAttendanceNotificationEmail]",
        errBody.message ?? res.status
      );
    }
  } catch (e) {
    console.warn(
      "[sendEmployeeAttendanceNotificationEmail]",
      e instanceof Error ? e.message : e
    );
  }
}
