import type { SupabaseClient } from "@supabase/supabase-js";

import { fromEmail } from "@/lib/resend";
import { buildResendEmailHeaderHtml } from "@/lib/resend-email-header";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Emails the Fusion Xpress campaign owner when a payer does not complete a checkout
 * (M-Pesa cancelled/failed, amount mismatch, etc.). Does not email the payer.
 * No-op if RESEND_API_KEY is missing or owner has no email.
 */
export async function notifyCampaignOwnerPaymentIncomplete(
  supabase: SupabaseClient,
  params: {
    campaignId: string;
    reference: string;
    amount: number;
    currency: string;
    provider: string;
    payerEmail?: string | null;
    payerName?: string | null;
    reason?: string;
  }
): Promise<void> {
  const resendKey = process.env.RESEND_API_KEY?.trim();
  if (!resendKey) return;

  const { data: camp, error: cErr } = await supabase
    .from("campaigns")
    .select("title,created_by")
    .eq("id", params.campaignId)
    .maybeSingle();

  if (cErr || !camp?.created_by) return;

  const ownerId = String(camp.created_by);
  const { data: userRes, error: uErr } = await supabase.auth.admin.getUserById(ownerId);
  if (uErr || !userRes?.user?.email) return;

  const to = String(userRes.user.email).trim().toLowerCase();
  if (!to || !to.includes("@")) return;

  const campaignTitle = escapeHtml(String(camp.title ?? "Your campaign").trim() || "Your campaign");
  const ref = escapeHtml(params.reference);
  const cur = escapeHtml(String(params.currency ?? "").toUpperCase() || "—");
  const amt = Number(params.amount);
  const amountStr = Number.isFinite(amt) ? escapeHtml(amt.toLocaleString()) : escapeHtml(String(params.amount));
  const provider = escapeHtml(String(params.provider ?? "—"));
  const payer =
    params.payerName?.trim() || params.payerEmail?.trim()
      ? escapeHtml((params.payerName?.trim() || params.payerEmail?.trim()) ?? "")
      : "—";
  const reason = params.reason?.trim() ? escapeHtml(params.reason.trim()) : "";

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: Arial, Helvetica, sans-serif; line-height: 1.6; color: #1f2937; margin: 0; padding: 0; background: #f3f4f6;">
  <div style="max-width: 600px; margin: 0 auto; padding: 24px 16px;">
    ${buildResendEmailHeaderHtml({
      primaryTitle: "Changer Fusions",
      subtitle: "Payment not completed",
    })}
    <div style="background: #ffffff; padding: 28px 24px 32px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb; border-top: none;">
      <p style="margin: 0 0 16px;">Someone started a payment on <strong>${campaignTitle}</strong> but did not complete it. This does not appear on your client-facing payment report.</p>
      <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin: 0 0 20px;">
        <tr><td style="padding: 6px 0; color: #6b7280;">Reference</td><td style="padding: 6px 0; font-weight: 600;">${ref}</td></tr>
        <tr><td style="padding: 6px 0; color: #6b7280;">Amount</td><td style="padding: 6px 0; font-weight: 600;">${cur} ${amountStr}</td></tr>
        <tr><td style="padding: 6px 0; color: #6b7280;">Provider</td><td style="padding: 6px 0; font-weight: 600;">${provider}</td></tr>
        <tr><td style="padding: 6px 0; color: #6b7280;">Payer (if provided)</td><td style="padding: 6px 0; font-weight: 600;">${payer}</td></tr>
        ${reason ? `<tr><td style="padding: 6px 0; color: #6b7280;">Note</td><td style="padding: 6px 0;">${reason}</td></tr>` : ""}
      </table>
      <p style="margin: 0; font-size: 13px; color: #6b7280;">Admins and managers can still see incomplete payments in the dashboard for reconciliation.</p>
    </div>
  </div>
</body>
</html>`;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: fromEmail,
        to: [to],
        subject: `Payment not completed — ${String(camp.title ?? "Campaign").slice(0, 80)}`,
        html,
      }),
    });
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      console.warn(
        "[notifyCampaignOwnerPaymentIncomplete] Resend error:",
        (errBody as { message?: string })?.message ?? res.status
      );
    }
  } catch (e) {
    console.warn("[notifyCampaignOwnerPaymentIncomplete]", e instanceof Error ? e.message : e);
  }
}
