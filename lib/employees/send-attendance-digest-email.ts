import { fromEmail } from "@/lib/resend";
import { buildResendEmailHeaderHtml } from "@/lib/resend-email-header";
import { attendanceReportsPlatformAdminEmails } from "@/lib/fusion-xpress-admin-emails";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export type AttendanceDigestKind = "daily" | "weekly" | "monthly";

const KIND_LABEL: Record<AttendanceDigestKind, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
};

export async function sendAttendanceDigestEmail(params: {
  to: string[];
  businessName: string;
  kind: AttendanceDigestKind;
  from: string;
  toDate: string;
  periodLabel: string;
  rowCount: number;
  pdfAttachment: { filename: string; contentBase64: string };
  excelAttachment?: { filename: string; contentBase64: string } | null;
}): Promise<boolean> {
  const resendApiKey = process.env.RESEND_API_KEY?.trim();
  if (!resendApiKey) return false;

  const allRecipients = params.to
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.includes("@"));
  if (allRecipients.length === 0) return false;

  const platformAdmins = new Set(attendanceReportsPlatformAdminEmails());
  const to = allRecipients.filter((e) => !platformAdmins.has(e));
  const bcc = allRecipients.filter((e) => platformAdmins.has(e));
  // Resend requires at least one To address.
  if (to.length === 0) {
    to.push(...bcc);
    bcc.length = 0;
  }

  const kindLabel = KIND_LABEL[params.kind];
  const org = escapeHtml(params.businessName.trim() || "Your organisation");
  const period = escapeHtml(params.periodLabel);
  const base = (process.env.NEXT_PUBLIC_SITE_URL || "https://cmfagency.co.ke").replace(/\/$/, "");
  const dashboardUrl = `${base}/dashboard/visitor-management/employees/summary-reports`;

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="x-apple-disable-message-reformatting">
</head>
<body style="margin:0;padding:0;width:100%;background:#f9fafb;-webkit-text-size-adjust:100%;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;background:#f9fafb;">
<tr><td style="padding:0;">
${buildResendEmailHeaderHtml({ subtitle: "Fusion Xpress · Attendance summary", fullWidth: true })}
</td></tr>
<tr><td style="padding:28px 24px 40px;font-family:Arial,Helvetica,sans-serif;color:#333333;line-height:1.5;text-align:left;">
<p style="margin:0 0 18px;font-size:28px;font-weight:700;line-height:1.25;color:#132a46;">${escapeHtml(kindLabel)} attendance summary</p>
<p style="margin:0 0 20px;font-size:18px;line-height:1.5;">
Here is the <strong>${escapeHtml(kindLabel.toLowerCase())}</strong> attendance register for <strong>${org}</strong>.
</p>
<ul style="margin:0 0 24px;padding-left:22px;font-size:18px;line-height:1.5;">
<li style="margin:0 0 8px;"><strong>Period:</strong> ${period}</li>
<li style="margin:0;"><strong>Records:</strong> ${params.rowCount}</li>
</ul>
<p style="margin:0 0 24px;padding:16px 18px;background:#ecfdf5;border-radius:8px;border:1px solid #a7f3d0;font-size:18px;line-height:1.5;">
<strong>PDF attached</strong> — download and save the register. An Excel copy is also attached for filtering and payroll use.
</p>
<p style="margin:0 0 28px;">
<a href="${escapeHtml(dashboardUrl)}" style="display:inline-block;background:#2ca57c;color:#ffffff;font-size:18px;font-weight:700;padding:14px 28px;text-decoration:none;border-radius:6px;">Open summary reports</a>
</p>
<p style="margin:0;font-size:15px;line-height:1.5;color:#6b7280;">
This summary is sent to the business account and listed notification recipients. Fusion Xpress platform admins also receive a copy for every organisation.
</p>
</td></tr>
</table>
</body>
</html>`;

  const attachments: { filename: string; content: string }[] = [
    {
      filename: params.pdfAttachment.filename,
      content: params.pdfAttachment.contentBase64,
    },
  ];
  if (params.excelAttachment) {
    attachments.push({
      filename: params.excelAttachment.filename,
      content: params.excelAttachment.contentBase64,
    });
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: fromEmail,
        to,
        ...(bcc.length > 0 ? { bcc } : {}),
        subject: `${kindLabel} attendance summary — ${params.businessName} (${params.periodLabel})`,
        html,
        attachments,
      }),
    });
    if (!res.ok) {
      const errBody = (await res.json().catch(() => ({}))) as { message?: string };
      console.warn("[sendAttendanceDigestEmail]", errBody.message ?? res.status);
      return false;
    }
    return true;
  } catch (e) {
    console.warn("[sendAttendanceDigestEmail]", e instanceof Error ? e.message : e);
    return false;
  }
}
