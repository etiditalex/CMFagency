import { fromEmail } from "@/lib/resend";
import { buildResendEmailHeaderHtml } from "@/lib/resend-email-header";
import { countDaysInLeaveRange, leaveTypeLabel } from "@/lib/employees/leave-rules";
import type { EmployeeLeaveType } from "@/lib/employees/types";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatLeaveDateRange(startDate: string, endDate: string): string {
  if (startDate === endDate) return startDate;
  return `${startDate} to ${endDate}`;
}

export async function sendEmployeeLeaveApprovedEmail(params: {
  to: string;
  employeeName: string;
  businessName: string;
  leaveType: EmployeeLeaveType | string;
  startDate: string;
  endDate: string;
  notes?: string;
}): Promise<boolean> {
  const resendApiKey = process.env.RESEND_API_KEY?.trim();
  const recipient = params.to.trim().toLowerCase();
  if (!resendApiKey || !recipient.includes("@")) return false;

  const dayCount = countDaysInLeaveRange(params.startDate, params.endDate);
  const dayLabel = dayCount === 1 ? "1 leave day has" : `${dayCount} leave days have`;
  const name = escapeHtml(params.employeeName.trim() || "Team member");
  const org = escapeHtml(params.businessName.trim() || "Your organisation");
  const typeLabel = escapeHtml(leaveTypeLabel(params.leaveType));
  const range = escapeHtml(formatLeaveDateRange(params.startDate, params.endDate));
  const notes = params.notes?.trim() ? escapeHtml(params.notes.trim()) : "";

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
${buildResendEmailHeaderHtml({ subtitle: "Fusion Xpress · Leave approved" })}
<div style="background: #f9fafb; padding: 24px; border-radius: 0 0 10px 10px; text-align: left;">
<p style="margin: 0 0 16px; font-size: 16px;"><strong>Leave granted</strong></p>
<p style="margin: 0 0 16px;">
Hi <strong>${name}</strong>, your leave at <strong>${org}</strong> has been approved.
</p>
<p style="margin: 0 0 16px;">
<strong>${dayLabel}</strong> been granted for <strong>${typeLabel}</strong> (${range}).
</p>
<ul style="margin: 0 0 20px; padding-left: 20px;">
<li><strong>Leave type:</strong> ${typeLabel}</li>
<li><strong>Dates:</strong> ${range}</li>
<li><strong>Days:</strong> ${dayCount}</li>
${notes ? `<li><strong>Note:</strong> ${notes}</li>` : ""}
</ul>
<p style="margin: 0; font-size: 14px; color: #374151;">
You do not need to sign in on these days — they will appear as approved leave on the organisation attendance register.
</p>
<p style="margin: 24px 0 0; font-size: 12px; color: #6b7280;">
This message was sent because your employer approved leave in Fusion Xpress Employee Attendance.
</p>
</div>
</body>
</html>`;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: fromEmail,
        to: recipient,
        subject: `Leave approved: ${dayCount} day${dayCount === 1 ? "" : "s"} — ${params.businessName}`,
        html,
      }),
    });
    if (!res.ok) {
      const errBody = (await res.json().catch(() => ({}))) as { message?: string };
      console.warn("[sendEmployeeLeaveApprovedEmail]", errBody.message ?? res.status);
      return false;
    }
    return true;
  } catch (e) {
    console.warn("[sendEmployeeLeaveApprovedEmail]", e instanceof Error ? e.message : e);
    return false;
  }
}
