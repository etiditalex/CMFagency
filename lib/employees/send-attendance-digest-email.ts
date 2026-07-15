import { fromEmail } from "@/lib/resend";
import { buildResendEmailHeaderHtml } from "@/lib/resend-email-header";

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

  const recipients = params.to
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.includes("@"));
  if (recipients.length === 0) return false;

  const kindLabel = KIND_LABEL[params.kind];
  const org = escapeHtml(params.businessName.trim() || "Your organisation");
  const period = escapeHtml(params.periodLabel);
  const base = (process.env.NEXT_PUBLIC_SITE_URL || "https://cmfagency.co.ke").replace(/\/$/, "");
  const dashboardUrl = `${base}/dashboard/visitor-management/employees/summary-reports`;

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
${buildResendEmailHeaderHtml({ subtitle: "Fusion Xpress · Attendance summary" })}
<div style="background: #f9fafb; padding: 24px; border-radius: 0 0 10px 10px; text-align: left;">
<p style="margin: 0 0 16px; font-size: 16px;"><strong>${escapeHtml(kindLabel)} attendance summary</strong></p>
<p style="margin: 0 0 16px;">
Here is the <strong>${escapeHtml(kindLabel.toLowerCase())}</strong> attendance register for <strong>${org}</strong>.
</p>
<ul style="margin: 0 0 20px; padding-left: 20px;">
<li><strong>Period:</strong> ${period}</li>
<li><strong>Records:</strong> ${params.rowCount}</li>
</ul>
<p style="margin: 0 0 16px; padding: 14px; background: #ecfdf5; border-radius: 8px; border: 1px solid #a7f3d0;">
<strong>PDF attached</strong> — download and save the register. An Excel copy is also attached for filtering and payroll use.
</p>
<p style="margin: 0 0 16px;">
<a href="${escapeHtml(dashboardUrl)}" style="display: inline-block; background: #2ca57c; color: #ffffff; font-weight: 700; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Open summary reports</a>
</p>
<p style="margin: 24px 0 0; font-size: 12px; color: #6b7280;">
Individual sign-in/sign-out emails are no longer sent for each scan. You receive daily, weekly, and monthly PDF summaries instead.
</p>
</div>
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
        to: recipients,
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
