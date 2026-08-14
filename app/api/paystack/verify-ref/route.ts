import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { paystackChargeMatchesTransaction } from "@/lib/paystack-charge-matches-transaction";
import { finalizePaystackTransactionSuccess, type PaystackFulfillmentRow } from "@/lib/paystack-finalize-success";
import {
  dbStatusForPaystackTerminal,
  paystackStatusIsTerminalNonSuccess,
} from "@/lib/paystack-verify-status";
import { notifyCampaignOwnerPaymentIncomplete } from "@/lib/notify-campaign-owner-payment-incomplete";
import { schedulePaymentEmailsAfterResponse } from "@/lib/deliver-payment-emails";

export const dynamic = "force-dynamic";

/**
 * Calls Paystack's verify API for one reference and completes the transaction if paid.
 * Use when the webhook is slow or misconfigured; safe to call repeatedly (idempotent).
 *
 * POST JSON: { "ref": "cmf_..." }
 */
export async function POST(req: Request) {
  let body: { ref?: string };
  try {
    body = (await req.json()) as { ref?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const ref = String(body?.ref ?? "").trim();
  if (!ref || !/^[A-Za-z0-9._-]{6,128}$/.test(ref)) {
    return NextResponse.json({ error: "Invalid ref" }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const paystackSecret = process.env.PAYSTACK_SECRET_KEY;

  if (!supabaseUrl || !supabaseServiceKey || !paystackSecret) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });

  const { data: tx, error: txErr } = await supabase
    .from("transactions")
    .select(
      "id,reference,provider,campaign_id,campaign_type,contestant_id,quantity,amount,currency,status,fulfilled_at,metadata,coupon_id,email,payer_name"
    )
    .eq("reference", ref)
    .maybeSingle();

  if (txErr) return NextResponse.json({ error: txErr.message }, { status: 500 });
  if (!tx) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (String((tx as { provider?: string }).provider ?? "").toLowerCase() !== "paystack") {
    return NextResponse.json({ error: "Not a Paystack transaction" }, { status: 400 });
  }

  const status = String((tx as { status?: string }).status ?? "pending");
  if (status !== "pending") {
    if (status === "success") {
      schedulePaymentEmailsAfterResponse(supabase, String((tx as { id: string }).id), "[paystack/verify-ref]");
    }
    return NextResponse.json({ ok: true, status, completed: status === "success" });
  }

  const res = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(ref)}`, {
    headers: { Authorization: `Bearer ${paystackSecret}` },
  });
  const json = (await res.json()) as {
    status?: boolean;
    data?: { status?: string; amount?: number; currency?: string; paid_at?: string };
  };

  if (!res.ok || !json?.data) {
    return NextResponse.json({ ok: false, error: "Paystack verify failed" }, { status: 502 });
  }

  const paystackStatusRaw = String(json.data?.status ?? "").toLowerCase() || "unknown";

  if (paystackStatusRaw !== "success") {
    if (paystackStatusIsTerminalNonSuccess(paystackStatusRaw)) {
      const nextStatus = dbStatusForPaystackTerminal(paystackStatusRaw);
      const prevMeta =
        typeof tx.metadata === "object" && tx.metadata !== null && !Array.isArray(tx.metadata)
          ? { ...(tx.metadata as Record<string, unknown>) }
          : {};
      await supabase
        .from("transactions")
        .update({
          status: nextStatus,
          verified_at: new Date().toISOString(),
          metadata: {
            ...prevMeta,
            paystack_status: paystackStatusRaw,
            reconciled_via: "verify-ref",
          },
        } as Record<string, unknown>)
        .eq("id", (tx as { id: string }).id);
      return NextResponse.json({
        ok: true,
        status: nextStatus,
        paystack: paystackStatusRaw,
        completed: false,
        reconciled: true,
      });
    }
    return NextResponse.json({ ok: true, status: "pending", paystack: paystackStatusRaw });
  }

  const paidAmountSubunit = Number(json.data?.amount ?? 0);
  const paidCurrency = (json.data?.currency ?? "").toUpperCase();
  const match = paystackChargeMatchesTransaction(paidAmountSubunit, paidCurrency, tx as PaystackFulfillmentRow);
  if (!match.ok) {
    await supabase
      .from("transactions")
      .update({
        status: "failed",
        verified_at: new Date().toISOString(),
        metadata: {
          ...((typeof tx.metadata === "object" && tx.metadata ? tx.metadata : {}) as Record<string, unknown>),
          webhook_error: match.code === "amount" ? "amount_mismatch" : "currency_mismatch",
          paystack_amount: paidAmountSubunit,
          paystack_currency: paidCurrency,
        },
      } as Record<string, unknown>)
      .eq("id", (tx as { id: string }).id);

    void notifyCampaignOwnerPaymentIncomplete(supabase, {
      campaignId: String((tx as { campaign_id: string }).campaign_id),
      reference: ref,
      amount: Number((tx as { amount?: number }).amount),
      currency: String((tx as { currency?: string }).currency ?? "KES"),
      provider: "Paystack",
      payerEmail: (tx as { email?: string | null }).email,
      payerName: (tx as { payer_name?: string | null }).payer_name,
      reason: "Paystack verify: amount or currency did not match the checkout",
    });

    return NextResponse.json({ ok: true, status: "failed", reason: "amount_or_currency_mismatch" });
  }

  const { fulfillErr } = await finalizePaystackTransactionSuccess(supabase, tx as PaystackFulfillmentRow, {
    paidAt: json.data?.paid_at ?? new Date().toISOString(),
    metadataPatch: {},
  });

  if (fulfillErr) {
    console.error("[paystack/verify-ref] finalize failed:", fulfillErr);
    return NextResponse.json({ ok: false, status: "pending", error: fulfillErr }, { status: 200 });
  }

  return NextResponse.json({ ok: true, status: "success", completed: true });
}
