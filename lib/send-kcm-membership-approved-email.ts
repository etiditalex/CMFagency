import { resend, fromEmail } from "@/lib/resend";
import { buildResendEmailHeaderHtml } from "@/lib/resend-email-header";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function sendKcmMembershipApprovedEmail(params: {
  to: string;
  firstName: string;
  membershipNumber: string;
}): Promise<{ ok: boolean; error?: string }> {
  const to = String(params.to ?? "").trim().toLowerCase();
  const firstName = String(params.firstName ?? "").trim() || "Member";
  const membershipNumber = String(params.membershipNumber ?? "").trim();

  if (!to || !to.includes("@")) return { ok: false, error: "invalid_recipient" };
  if (!membershipNumber) return { ok: false, error: "missing_membership_number" };
  if (!resend) return { ok: false, error: "RESEND_API_KEY not configured" };

  const subject = "Kenya-Coast Models membership approved";

  const html = `
  <div style="max-width: 640px; margin: 0 auto; padding: 18px 14px; background: #f1f5f9;">
    <div style="border-radius: 10px; overflow: hidden; border: 1px solid #e2e8f0; background: #ffffff;">
      ${buildResendEmailHeaderHtml({ subtitle: "Kenya Coast Models" })}
      <div style="padding: 20px 22px 22px; font-family: Arial, Helvetica, sans-serif; color: #0f172a;">
        <p style="margin: 0 0 12px; font-size: 15px; line-height: 1.55;">Dear ${escapeHtml(firstName)},</p>
        <p style="margin: 0 0 14px; font-size: 15px; line-height: 1.55;">
          Your Kenya-Coast Models membership registration has been successfully confirmed.
        </p>
        <p style="margin: 0 0 18px; font-size: 15px; line-height: 1.55;">
          <strong>Membership Number:</strong> ${escapeHtml(membershipNumber)}
        </p>
        <p style="margin: 0; font-size: 15px; line-height: 1.55;">
          Please keep your membership number for future reference and official communication.
        </p>
      </div>
    </div>
    <p style="margin: 12px 4px 0; font-family: Arial, Helvetica, sans-serif; font-size: 12px; color: #64748b;">
      If you did not request this, you can ignore this email.
    </p>
  </div>`;

  const { error } = await resend.emails.send({
    from: fromEmail,
    to,
    subject,
    html,
  });

  if (error) return { ok: false, error: error.message ?? "send_failed" };
  return { ok: true };
}

