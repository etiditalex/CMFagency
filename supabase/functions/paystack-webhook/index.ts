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

  // Fulfill based on campaign type.
  if (tx.campaign_type === "vote") {
    if (!tx.contestant_id) return new Response("ok", { status: 200 });

    // One row per transaction (unique on transaction_id).
    await supabase.from("votes").upsert(
      {
        transaction_id: tx.id,
        campaign_id: tx.campaign_id,
        contestant_id: tx.contestant_id,
        votes: tx.quantity,
      },
      { onConflict: "transaction_id", ignoreDuplicates: true },
    );
  } else {
    // Tickets: one row per transaction (unique on transaction_id).
    await supabase.from("ticket_issues").upsert(
      {
        transaction_id: tx.id,
        campaign_id: tx.campaign_id,
        quantity: tx.quantity,
      },
      { onConflict: "transaction_id", ignoreDuplicates: true },
    );
  }

  // Set fulfilled_at last. If webhook retries, vote/ticket upserts are safe, and this
  // prevents any future fulfillment attempts for the same transaction.
  await supabase
    .from("transactions")
    .update({ fulfilled_at: new Date().toISOString() } as any)
    .eq("id", tx.id)
    .is("fulfilled_at", null);

  // Send receipt email (holder name, ticket/vote number, amount) - real name preferred over email
  const toEmail = (tx as any).email?.trim?.();
  if (toEmail) {
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

