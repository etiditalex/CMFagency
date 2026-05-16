import type { SupabaseClient } from "@supabase/supabase-js";
import { fromEmail } from "@/lib/resend";
import { buildResendEmailHeaderHtml } from "@/lib/resend-email-header";

const CODE_EXPIRY_MINUTES = 10;

export async function sendVisitorLoginCodeEmail(
  admin: SupabaseClient,
  userId: string,
  email: string,
  options?: { subject?: string; headline?: string; intro?: string }
): Promise<{ ok: true } | { error: string }> {
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) return { error: "Email service not configured" };

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + CODE_EXPIRY_MINUTES * 60 * 1000);

  await admin.from("portal_login_codes").delete().eq("user_id", userId);
  const { error: insertErr } = await admin.from("portal_login_codes").insert({
    user_id: userId,
    code,
    expires_at: expiresAt.toISOString(),
  });
  if (insertErr) return { error: insertErr.message };

  const subject = options?.subject ?? "Your Fusion Xpress Visitor Management login code";
  const headline = options?.headline ?? "Your login verification code";
  const intro =
    options?.intro ??
    "Use this code to sign in to your Smart Visitor Management dashboard:";

  const emailHtml = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
${buildResendEmailHeaderHtml({ subtitle: "Fusion Xpress · Smart Visitor Management" })}
<div style="background: #f9fafb; padding: 24px; border-radius: 0 0 10px 10px;">
<h2 style="color: #111827; margin-top: 0;">${headline}</h2>
<p>${intro}</p>
<div style="background: white; border: 2px solid #1e3a8a; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
<p style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1e3a8a; margin: 0; font-family: monospace;">${code}</p>
</div>
<p style="color: #6b7280;">This code expires in ${CODE_EXPIRY_MINUTES} minutes.</p>
<p style="color: #6b7280; font-size: 12px;">Changer Fusions · CMF Agency</p>
</div>
</body>
</html>`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: fromEmail, to: email, subject, html: emailHtml }),
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    return { error: (errBody as { message?: string }).message ?? "Failed to send email" };
  }

  return { ok: true };
}
