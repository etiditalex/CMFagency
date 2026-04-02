/// <reference lib="deno.ns" />

/**
 * Supabase Edge Function: Paystack webhook handler
 * -----------------------------------------------------------------------------
 * Requirements satisfied:
 * - Payment status is confirmed ONLY by webhook (this function), never frontend.
 * - Voting is idempotent: one vote row per transaction (unique on transaction_id).
 * - Ticket issuance is idempotent: one ticket_issues row per transaction (unique).
 *
 * Env required in Supabase Edge Function settings:
 * - SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 * - PAYSTACK_SECRET_KEY  (used to verify x-paystack-signature)
 *
 * Optional (for receipt email):
 * - RESEND_API_KEY
 * - RESEND_FROM_EMAIL
 */

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

function toHex(bytes: ArrayBuffer) {
  return Array.from(new Uint8Array(bytes))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function notifyCampaignOwnerPaymentIncompleteDeno(
  supabase: ReturnType<typeof createClient>,
  params: {
    campaignId: string;
    reference: string;
    amount: number;
    currency: string;
    provider: string;
    payerEmail?: string | null;
    payerName?: string | null;
    reason?: string;
  },
) {
  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (!resendKey) return;

  const { data: camp, error: cErr } = await supabase
    .from("campaigns")
    .select("title,created_by")
    .eq("id", params.campaignId)
    .maybeSingle();

  if (cErr || !camp?.created_by) return;

  const { data: userRes, error: uErr } = await supabase.auth.admin.getUserById(String(camp.created_by));
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
  const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "CMF Agency <noreply@resend.dev>";

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: Arial, Helvetica, sans-serif; line-height: 1.6; color: #1f2937; margin: 0; padding: 0; background: #f3f4f6;">
  <div style="max-width: 600px; margin: 0 auto; padding: 24px 16px;">
    <div style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 20px 24px; text-align: center; border-radius: 10px 10px 0 0;">
      <p style="margin: 0; color: rgba(255,255,255,0.95); font-size: 13px; letter-spacing: 0.04em; text-transform: uppercase;">Changer Fusions</p>
      <h1 style="margin: 8px 0 0; color: #ffffff; font-size: 1.25rem;">Payment not completed</h1>
    </div>
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
        "[paystack-webhook] incomplete payment notify:",
        (errBody as { message?: string })?.message ?? res.status,
      );
    }
  } catch (e) {
    console.warn("[paystack-webhook] incomplete payment notify:", e);
  }
}

async function hmacSha512Hex(secret: string, payload: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return toHex(sig);
}

type PaystackEvent = {
  event?: string;
  data?: {
    reference?: string;
    amount?: number;
    currency?: string;
    paid_at?: string;
    status?: string;
    customer?: { email?: string };
    id?: number;
  };
};

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const paystackSecret = Deno.env.get("PAYSTACK_SECRET_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!paystackSecret || !supabaseUrl || !supabaseServiceKey) {
    return new Response("Missing server configuration", { status: 500 });
  }

  // IMPORTANT: verify signature against the raw request body
  const rawBody = await req.text();
  const signature = req.headers.get("x-paystack-signature") ?? "";
  const computed = await hmacSha512Hex(paystackSecret, rawBody);

  if (!signature || signature !== computed) {
    // Do not leak details
    return new Response("Invalid signature", { status: 401 });
  }

  let payload: PaystackEvent;
  try {
    payload = JSON.parse(rawBody) as PaystackEvent;
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  // We only handle successful charges for MVP.
  if (payload.event !== "charge.success") {
    return new Response("ok", { status: 200 });
  }

  const reference = payload.data?.reference;
  if (!reference) return new Response("ok", { status: 200 });

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });

  // Fetch the transaction we created during initialization.
  const { data: tx, error: txErr } = await supabase
    .from("transactions")
    .select("id,campaign_id,campaign_type,contestant_id,quantity,amount,currency,status,fulfilled_at,metadata,email,payer_name")
    .eq("reference", reference)
    .single();

  if (txErr || !tx) {
    // Unknown reference: acknowledge to avoid provider retries looping forever.
    return new Response("ok", { status: 200 });
  }

  // Basic consistency checks (prevents mismatched webhook payloads from being counted).
  // Paystack sends amount in subunit (cents/kobo). Our tx.amount is in whole units.
  const paidAmountSubunit = Number(payload.data?.amount ?? 0);
  const expectedSubunit = Math.round(Number(tx.amount) * 100);
  const paidCurrency = (payload.data?.currency ?? "").toUpperCase();
  if (paidAmountSubunit !== expectedSubunit || paidCurrency !== String(tx.currency).toUpperCase()) {
    // Record failure state for audit, but do not fulfill.
    await supabase
      .from("transactions")
      .update({
        status: "failed",
        verified_at: new Date().toISOString(),
        metadata: {
          ...(typeof (tx as any).metadata === "object" && (tx as any).metadata ? (tx as any).metadata : {}),
          webhook_error: "amount_or_currency_mismatch",
          paystack_amount: paidAmountSubunit,
          paystack_currency: paidCurrency,
          paystack_event_id: payload.data?.id ?? null,
        },
      } as any)
      .eq("id", tx.id);

    await notifyCampaignOwnerPaymentIncompleteDeno(supabase, {
      campaignId: tx.campaign_id,
      reference,
      amount: Number(tx.amount),
      currency: String(tx.currency),
      provider: "paystack",
      payerEmail: (tx as any).email ?? null,
      payerName: (tx as any).payer_name ?? null,
      reason: "Paystack amount or currency did not match the checkout (webhook).",
    });

    return new Response("ok", { status: 200 });
  }

  // Mark transaction as verified successful (fulfillment is handled below and is idempotent).
  await supabase
    .from("transactions")
    .update({
      status: "success",
      verified_at: new Date().toISOString(),
      paid_at: payload.data?.paid_at ?? null,
      metadata: {
        ...(typeof (tx as any).metadata === "object" && (tx as any).metadata ? (tx as any).metadata : {}),
        paystack_event_id: payload.data?.id ?? null,
        paystack_status: payload.data?.status ?? null,
      },
    } as any)
    .eq("id", tx.id);

  // If already fulfilled, stop (idempotency).
  if (tx.fulfilled_at) return new Response("ok", { status: 200 });

  // Merchandise: no ticket_issues/votes, just mark fulfilled
  const meta = typeof (tx as any).metadata === "object" && (tx as any).metadata ? (tx as any).metadata : {};
  if (meta.merchandise_cart === true) {
    await supabase
      .from("transactions")
      .update({ fulfilled_at: new Date().toISOString() } as any)
      .eq("id", tx.id)
      .is("fulfilled_at", null);
    return new Response("ok", { status: 200 });
  }

  let fulfillErr: string | null = null;
  if (tx.campaign_type === "vote") {
    if (!tx.contestant_id) {
      fulfillErr = "vote_missing_contestant_id";
    } else {
      const { error: voteUpsertErr } = await supabase.from("votes").upsert(
        {
          transaction_id: tx.id,
          campaign_id: tx.campaign_id,
          contestant_id: tx.contestant_id,
          votes: tx.quantity,
        },
        { onConflict: "transaction_id", ignoreDuplicates: true },
      );
      if (voteUpsertErr) fulfillErr = voteUpsertErr.message;
    }
  } else {
    const { error: ticketUpsertErr } = await supabase.from("ticket_issues").upsert(
      {
        transaction_id: tx.id,
        campaign_id: tx.campaign_id,
        quantity: tx.quantity,
      },
      { onConflict: "transaction_id", ignoreDuplicates: true },
    );
    if (ticketUpsertErr) fulfillErr = ticketUpsertErr.message;
  }

  if (!fulfillErr) {
    await supabase
      .from("transactions")
      .update({ fulfilled_at: new Date().toISOString() } as any)
      .eq("id", tx.id)
      .is("fulfilled_at", null);
  } else {
    console.error("[paystack-webhook] fulfillment failed:", fulfillErr);
    await supabase
      .from("transactions")
      .update({
        metadata: {
          ...(typeof (tx as any).metadata === "object" && (tx as any).metadata ? (tx as any).metadata : {}),
          paystack_event_id: payload.data?.id ?? null,
          paystack_status: payload.data?.status ?? null,
          fulfillment_error: fulfillErr,
        },
      } as any)
      .eq("id", tx.id);
  }

  const toEmail = (tx as any).email?.trim?.();
  if (toEmail && !fulfillErr) {
    const resendKey = Deno.env.get("RESEND_API_KEY");
    const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "CMF Agency <noreply@resend.dev>";
    const holderName = (tx as any).payer_name?.trim?.() || toEmail;
    const ticketSuffix = reference.replace(/^cmf_/, "").slice(-8).toUpperCase();
    const meta = typeof (tx as any).metadata === "object" && (tx as any).metadata ? (tx as any).metadata : {};
    const slug = meta.slug || meta.campaign_slug || "event";
    const prefix = String(slug).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
    const typeCode = tx.campaign_type === "vote" ? "VOT" : meta.merchandise_cart ? "ORD" : "TKT";
    const ticketNumber = `${prefix}-${typeCode}-${ticketSuffix}`;
    const campaignTitle = meta.campaign_title || meta.slug || "Event";

    if (resendKey) {
      const typeLabel = tx.campaign_type === "vote" ? "Vote" : meta.merchandise_cart ? "Order" : "Ticket";
      const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 560px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 24px; text-align: center; border-radius: 12px 12px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 1.4rem;">${String(campaignTitle).replace(/</g, "&lt;")}</h1>
    <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0;">Payment confirmed</p>
  </div>
  <div style="background: #f8f9fa; padding: 24px; border: 1px solid #e9ecef; border-top: none; border-radius: 0 0 12px 12px;">
    <table style="width:100%; border-collapse: collapse;">
      <tr><td style="padding: 8px 0; color: #666;">${typeLabel} number:</td><td style="padding: 8px 0; font-weight: bold; font-family: monospace;">${ticketNumber}</td></tr>
      <tr><td style="padding: 8px 0; color: #666;">${typeLabel === "Order" ? "Customer" : typeLabel} holder:</td><td style="padding: 8px 0; font-weight: bold;">${String(holderName).replace(/</g, "&lt;")}</td></tr>
      <tr><td style="padding: 8px 0; color: #666;">Amount paid:</td><td style="padding: 8px 0; font-weight: bold;">${String(tx.currency || "KES").toUpperCase()} ${Number(tx.amount || 0).toLocaleString()}</td></tr>
      <tr><td style="padding: 8px 0; color: #666;">Quantity:</td><td style="padding: 8px 0; font-weight: bold;">${tx.quantity} ${tx.campaign_type === "vote" ? "votes" : meta.merchandise_cart ? "items" : "tickets"}</td></tr>
    </table>
    <p style="margin-top: 20px; font-size: 12px; color: #666;">Reference: <code>${reference}</code></p>
  </div>
  <p style="color: #888; font-size: 11px; margin-top: 20px;">Sent by CMF Agency · Changer Fusions</p>
</body>
</html>`;
      try {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: fromEmail,
            to: toEmail,
            subject: `Your ${typeLabel.toLowerCase()} receipt – ${campaignTitle}`,
            html,
          }),
        });
      } catch {
        // Non-fatal: receipt email failed, payment still succeeded
      }
    }
  }

  return new Response("ok", { status: 200 });
});

