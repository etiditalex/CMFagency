import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

import { paystackChargeMatchesTransaction } from "@/lib/paystack-charge-matches-transaction";
import { finalizePaystackTransactionSuccess, type PaystackFulfillmentRow } from "@/lib/paystack-finalize-success";
import { notifyCampaignOwnerPaymentIncomplete } from "@/lib/notify-campaign-owner-payment-incomplete";
import {
  isPaymentEmailAlreadySent,
  asTransactionMeta,
  schedulePaymentEmailsAfterResponse,
} from "@/lib/deliver-payment-emails";
import { isLipaPolePoleMetadata } from "@/lib/lipa-pole-pole";
import { isVisitorSubscriptionPaymentMetadata } from "@/lib/visitors/subscription-pricing";
import { upsertVoteOrTicketForSuccessfulTx } from "@/lib/vote-ticket-fulfillment";

export const dynamic = "force-dynamic";

type PaystackEvent = {
  event?: string;
  data?: {
    reference?: string;
    amount?: number;
    currency?: string;
    paid_at?: string;
    status?: string;
    id?: number;
  };
};

function verifySignature(rawBody: string, signature: string | null, secret: string): boolean {
  if (!signature) return false;
  const hash = crypto.createHmac("sha512", secret).update(rawBody).digest("hex");
  return hash === signature;
}

/**
 * Paystack webhook on your **Vercel / Next.js** deployment.
 * Set this URL in Paystack Dashboard → Settings → Webhooks:
 *   https://YOUR_DOMAIN/api/paystack/webhook
 * (You can disable the Supabase Edge Function webhook if you use this URL only.)
 *
 * Verifies `x-paystack-signature` with `PAYSTACK_SECRET_KEY`, then mirrors the
 * Supabase `paystack-webhook` Edge Function behavior.
 *
 * ACK is returned as soon as votes/tickets are recorded; receipt email continues
 * after the response so Paystack does not retry on slow SMTP.
 */
export async function POST(req: Request) {
  const paystackSecret = process.env.PAYSTACK_SECRET_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!paystackSecret || !supabaseUrl || !supabaseServiceKey) {
    return new Response("Missing server configuration", { status: 500 });
  }

  const rawBody = await req.text();
  const signature = req.headers.get("x-paystack-signature");

  if (!verifySignature(rawBody, signature, paystackSecret)) {
    return new Response("Invalid signature", { status: 401 });
  }

  let payload: PaystackEvent;
  try {
    payload = JSON.parse(rawBody) as PaystackEvent;
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  if (payload.event !== "charge.success") {
    return new Response("ok", { status: 200 });
  }

  const reference = payload.data?.reference;
  if (!reference) return new Response("ok", { status: 200 });

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });

  const { data: tx, error: txErr } = await supabase
    .from("transactions")
    .select(
      "id,reference,campaign_id,campaign_type,contestant_id,quantity,amount,currency,status,fulfilled_at,metadata,email,payer_name,coupon_id"
    )
    .eq("reference", reference)
    .single();

  if (txErr || !tx) {
    return new Response("ok", { status: 200 });
  }

  const meta = asTransactionMeta((tx as { metadata?: unknown }).metadata);
  if (String((tx as { status?: string }).status ?? "") === "success") {
    const skipVoteTicketRepair =
      meta.merchandise_cart === true ||
      isLipaPolePoleMetadata(meta) ||
      Boolean(meta.service_invoice_id) ||
      isVisitorSubscriptionPaymentMetadata(meta);
    if (!skipVoteTicketRepair) {
      await upsertVoteOrTicketForSuccessfulTx(
        supabase,
        {
          id: String(tx.id),
          campaign_id: String(tx.campaign_id),
          campaign_type: String(tx.campaign_type),
          contestant_id: (tx as { contestant_id?: string | null }).contestant_id ?? null,
          quantity: Number(tx.quantity),
        },
        "[paystack/webhook]"
      );
    }
    if (!isPaymentEmailAlreadySent(meta)) {
      schedulePaymentEmailsAfterResponse(supabase, String(tx.id), "[paystack/webhook]");
    }
    return new Response("ok", { status: 200 });
  }

  const paidAmountSubunit = Number(payload.data?.amount ?? 0);
  const paidCurrency = (payload.data?.currency ?? "").toUpperCase();
  const match = paystackChargeMatchesTransaction(paidAmountSubunit, paidCurrency, tx as PaystackFulfillmentRow);

  if (!match.ok) {
    await supabase
      .from("transactions")
      .update({
        status: "failed",
        verified_at: new Date().toISOString(),
        metadata: {
          ...meta,
          webhook_error: match.code === "amount" ? "amount_mismatch" : "currency_mismatch",
          paystack_amount: paidAmountSubunit,
          paystack_currency: paidCurrency,
          paystack_event_id: payload.data?.id ?? null,
        },
      } as Record<string, unknown>)
      .eq("id", tx.id);

    void notifyCampaignOwnerPaymentIncomplete(supabase, {
      campaignId: String(tx.campaign_id),
      reference,
      amount: Number(tx.amount),
      currency: String(tx.currency),
      provider: "paystack",
      payerEmail: (tx as { email?: string | null }).email,
      payerName: (tx as { payer_name?: string | null }).payer_name,
      reason: "Paystack amount or currency did not match the checkout (webhook).",
    });

    return new Response("ok", { status: 200 });
  }

  const { fulfillErr } = await finalizePaystackTransactionSuccess(supabase, tx as PaystackFulfillmentRow, {
    paidAt: payload.data?.paid_at ?? null,
    metadataPatch: {
      paystack_event_id: payload.data?.id ?? null,
      paystack_status: payload.data?.status ?? null,
    },
  });

  if (fulfillErr) {
    console.error("[paystack/webhook] fulfillment failed:", fulfillErr);
  }

  return new Response("ok", { status: 200 });
}
