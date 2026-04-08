import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

import { paystackChargeMatchesTransaction } from "@/lib/paystack-charge-matches-transaction";
import { finalizePaystackTransactionSuccess, type PaystackFulfillmentRow } from "@/lib/paystack-finalize-success";
import { notifyCampaignOwnerPaymentIncomplete } from "@/lib/notify-campaign-owner-payment-incomplete";
import { sendReceiptEmail } from "@/lib/send-receipt-email";
import { fetchContestantNameById } from "@/lib/contestant-name-for-receipt";

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
          ...(typeof tx.metadata === "object" && tx.metadata ? (tx.metadata as Record<string, unknown>) : {}),
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

  const toEmail = (tx as { email?: string | null }).email?.trim?.();
  if (toEmail && !fulfillErr) {
    const meta =
      typeof tx.metadata === "object" && tx.metadata ? (tx.metadata as Record<string, unknown>) : {};
    const referenceStr = String(tx.reference);
    const holderName = (tx as { payer_name?: string | null }).payer_name?.trim?.() || toEmail;
    const ticketSuffix = referenceStr.replace(/^cmf_/, "").slice(-8).toUpperCase();
    const slug = String(meta.slug || meta.campaign_slug || "event");
    const prefix = slug.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
    const typeCode = tx.campaign_type === "vote" ? "VOT" : meta.merchandise_cart ? "ORD" : "TKT";
    const ticketNumber = `${prefix}-${typeCode}-${ticketSuffix}`;
    const campaignTitle = String(meta.campaign_title || meta.slug || "Event");
    const typeLabel = (tx.campaign_type === "vote" ? "Vote" : meta.merchandise_cart ? "Order" : "Ticket") as
      | "Ticket"
      | "Vote"
      | "Order";
    const quantityLabel =
      tx.campaign_type === "vote" ? "votes" : meta.merchandise_cart ? "items" : "tickets";
    const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://cmfagency.co.ke").replace(/\/$/, "");
    const viewTicketsUrl = slug && slug !== "event" ? `${baseUrl}/${slug}?ref=${encodeURIComponent(referenceStr)}` : undefined;
    const downloadReceiptUrl = `${baseUrl}/receipt?ref=${encodeURIComponent(referenceStr)}`;

    let eventLocation: string | undefined;
    let eventDate: string | undefined;
    let eventTime: string | undefined;
    if (slug && slug !== "event") {
      const { data: eventRow } = await supabase
        .from("fusion_events")
        .select("location, venue, event_date, time")
        .eq("ticket_campaign_slug", slug)
        .maybeSingle();
      if (eventRow) {
        const loc = (eventRow as { location?: string | null }).location;
        const venue = (eventRow as { venue?: string | null }).venue;
        eventLocation = venue && loc ? `${venue}, ${loc}` : loc || venue || undefined;
        const ed = (eventRow as { event_date?: string | null }).event_date;
        if (ed) eventDate = new Date(ed).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
        eventTime = (eventRow as { time?: string | null }).time ?? undefined;
      }
    }

    const votedForName =
      tx.campaign_type === "vote" ? await fetchContestantNameById(supabase, tx.contestant_id) : undefined;

    try {
      const emailResult = await sendReceiptEmail({
        to: toEmail,
        campaignTitle,
        typeLabel,
        ticketNumber,
        holderName,
        amount: `${String(tx.currency || "KES").toUpperCase()} ${Number(tx.amount || 0).toLocaleString()}`,
        quantity: `${tx.quantity} ${quantityLabel}`,
        reference: referenceStr,
        variant: "paystack",
        votedForName,
        viewTicketsUrl,
        downloadReceiptUrl,
        eventLocation,
        eventDate,
        eventTime,
      });
      if (!emailResult.ok) {
        console.warn("[paystack/webhook] Receipt email failed:", emailResult.error);
      }
    } catch (e) {
      console.warn("[paystack/webhook] Receipt email error:", e instanceof Error ? e.message : e);
    }
  }

  return new Response("ok", { status: 200 });
}
