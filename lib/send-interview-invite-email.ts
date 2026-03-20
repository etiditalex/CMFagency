import { fromEmail } from "@/lib/resend";
import { buildResendEmailHeaderHtml } from "@/lib/resend-email-header";
import type { JobOpening } from "@/lib/job-openings";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function sendInterviewInviteEmail(params: {
  to: string;
  firstName: string;
  cmfAgencyId: string;
  jobTitle: string;
  opening: JobOpening;
  /** ISO date string for interview (optional — admin can set in dashboard later via notes) */
  interviewDate?: string;
  interviewTime?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    return { ok: false, error: "RESEND_API_KEY not configured" };
  }

  const to = params.to.trim();
  if (!to || !to.includes("@")) {
    return { ok: false, error: "Invalid recipient email" };
  }

  const first = escapeHtml(params.firstName.trim() || "there");
  const id = escapeHtml(params.cmfAgencyId);
  const role = escapeHtml(params.jobTitle.trim());
  const office = escapeHtml(params.opening.officeName);
  const addr = escapeHtml(params.opening.officeAddress);
  const notes = escapeHtml(params.opening.interviewLocationNotes);
  const contact = params.opening.contactLine?.trim()
    ? `<p style="margin: 16px 0 0;"><strong>Contact:</strong> ${escapeHtml(params.opening.contactLine.trim())}</p>`
    : "";

  const whenBlock =
    params.interviewDate || params.interviewTime
      ? `<div style="background: white; border: 1px solid #c7d2fe; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <p style="margin: 0 0 8px;"><strong>Interview schedule</strong></p>
          ${params.interviewDate ? `<p style="margin: 0;"><strong>Date:</strong> ${escapeHtml(params.interviewDate)}</p>` : ""}
          ${params.interviewTime ? `<p style="margin: 8px 0 0;"><strong>Time:</strong> ${escapeHtml(params.interviewTime)}</p>` : ""}
        </div>`
      : `<p style="margin: 16px 0; color: #4b5563;">Our team will contact you shortly to confirm the exact date and time if not specified above.</p>`;

  const html = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        ${buildResendEmailHeaderHtml({ subtitle: "Interview invitation" })}
        <div style="background: #f9fafb; padding: 24px; border-radius: 0 0 10px 10px;">
          <h2 style="color: #111827; margin-top: 0;">Interview invitation</h2>
          <p>Hello ${first},</p>
          <p>Following review of your application <strong style="font-family: monospace;">${id}</strong>, we are pleased to invite you for an interview for the role of <strong>${role}</strong>.</p>
          ${whenBlock}
          <div style="background: #ecfdf5; border: 1px solid #6ee7b7; border-radius: 8px; padding: 16px; margin: 16px 0;">
            <p style="margin: 0 0 8px;"><strong>${office}</strong></p>
            <p style="margin: 0 0 8px;">${addr}</p>
            <p style="margin: 0; color: #065f46;">${notes}</p>
          </div>
          ${contact}
          <p style="color: #6b7280; font-size: 12px; margin-top: 24px;">CMF Agency / Changer Fusions</p>
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
      subject: `Interview invitation — ${params.opening.officeName} — ${params.cmfAgencyId}`,
      html,
    }),
  });

  if (!res.ok) {
    const errBody = (await res.json().catch(() => ({}))) as { message?: string; error?: string };
    return { ok: false, error: errBody.message ?? errBody.error ?? `Resend HTTP ${res.status}` };
  }

  return { ok: true };
}
