import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  finalizeDarajaStkFromMetadataItems,
  type CallbackMetadataItem,
} from "@/lib/daraja-finalize-stk-from-items";
import { canAutoReconcileDarajaStkQuery, isStkQueryStillPending } from "@/lib/daraja-stk-result";
import { fetchDarajaAccessToken } from "@/lib/daraja-oauth";
import {
  buildDarajaStkPassword,
  darajaStkTimestamp,
  parseMpesaBusinessShortCode,
} from "@/lib/daraja-stk-config";
import { parseDarajaStkQueryResponse } from "@/lib/daraja-stk-query-parse";
import { notifyCampaignOwnerPaymentIncomplete } from "@/lib/notify-campaign-owner-payment-incomplete";
import { sendPurchaseReminderByRef } from "@/lib/send-purchase-reminder";
import { schedulePaymentEmailsAfterResponse } from "@/lib/deliver-payment-emails";

export const dynamic = "force-dynamic";

/**
 * Queries Safaricom STK status for a pending M-Pesa transaction and finalizes it when paid.
 * Same as Paystack verify-ref: safe to call repeatedly when webhooks are slow.
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

  const consumerKey = process.env.MPESA_CONSUMER_KEY;
  const consumerSecret = process.env.MPESA_CONSUMER_SECRET;
  const shortCode = process.env.MPESA_SHORTCODE;
  const passKey = process.env.MPESA_PASSKEY;
  const baseUrl = (process.env.MPESA_BASE_URL ?? "https://sandbox.safaricom.co.ke").replace(/\/$/, "");
  const stkQueryUrl = process.env.MPESA_STKPUSH_QUERY_URL ?? `${baseUrl}/mpesa/stkpushquery/v1/query`;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }
  if (!consumerKey || !consumerSecret || !shortCode || !passKey) {
    return NextResponse.json({ error: "M-Pesa not configured" }, { status: 500 });
  }

  const businessShortCode = parseMpesaBusinessShortCode(shortCode);
  if (!businessShortCode) {
    return NextResponse.json({ error: "MPESA_SHORTCODE must be a valid numeric business short code." }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

  const { data: tx, error: txErr } = await supabase
    .from("transactions")
    .select(
      "id,campaign_id,campaign_type,contestant_id,quantity,amount,currency,reference,status,fulfilled_at,metadata,email,payer_name,coupon_id,provider"
    )
    .eq("reference", ref)
    .maybeSingle();

  if (txErr) return NextResponse.json({ error: txErr.message }, { status: 500 });
  if (!tx) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (String((tx as { provider?: string }).provider) !== "daraja") {
    return NextResponse.json({ error: "Not an M-Pesa transaction" }, { status: 400 });
  }

  const status = String((tx as { status?: string }).status ?? "pending");
  const meta =
    (typeof (tx as { metadata?: unknown }).metadata === "object" &&
      (tx as { metadata?: Record<string, unknown> }).metadata) ||
    {};
  const canReconcile = canAutoReconcileDarajaStkQuery(status);
  if (!canReconcile) {
    if (status === "success") {
      schedulePaymentEmailsAfterResponse(supabase, String((tx as { id: string }).id), "[Daraja verify-ref]");
    }
    return NextResponse.json({ ok: true, status, completed: status === "success" });
  }
  const checkoutRequestId = String(meta.checkout_request_id ?? "").trim();
  if (!checkoutRequestId) {
    return NextResponse.json({
      ok: true,
      status: "pending",
      error: "Waiting for M-Pesa checkout id — STK may still be starting.",
    });
  }

  const tokenResult = await fetchDarajaAccessToken();
  if (!tokenResult.ok) {
    return NextResponse.json({ error: "Daraja OAuth failed", detail: tokenResult.error }, { status: 502 });
  }

  const timestamp = darajaStkTimestamp();
  const password = buildDarajaStkPassword(businessShortCode, passKey, timestamp);

  const stkQueryBody = {
    BusinessShortCode: businessShortCode,
    Password: password,
    Timestamp: timestamp,
    CheckoutRequestID: checkoutRequestId,
  };

  const queryRes = await fetch(stkQueryUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${tokenResult.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(stkQueryBody),
  });

  const queryJson: unknown = await queryRes.json().catch(() => ({}));

  if (!queryRes.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: "Daraja STK query HTTP error",
        http_status: queryRes.status,
      },
      { status: 502 }
    );
  }

  const parsed = parseDarajaStkQueryResponse(queryJson);
  if (!parsed.parseOk) {
    return NextResponse.json(
      {
        ok: false,
        error: "Could not parse Daraja STK query response",
      },
      { status: 502 }
    );
  }

  const { resultCode, resultDesc, items } = parsed;

  if (resultCode !== 0) {
    if (isStkQueryStillPending(resultCode, resultDesc, items)) {
      return NextResponse.json({
        ok: true,
        status: "pending",
        daraja_result_code: resultCode,
        daraja_result_desc: resultDesc,
      });
    }

    const prevMeta =
      typeof (tx as { metadata?: unknown }).metadata === "object" &&
      (tx as { metadata?: unknown }).metadata !== null &&
      !Array.isArray((tx as { metadata?: unknown }).metadata)
        ? { ...((tx as { metadata: Record<string, unknown> }).metadata) }
        : {};
    const { error: failUpErr } = await supabase
      .from("transactions")
      .update({
        status: "failed",
        verified_at: new Date().toISOString(),
        metadata: {
          ...prevMeta,
          daraja_result_code: resultCode,
          daraja_result_desc: resultDesc,
          reconciled_via: "daraja_verify_ref_stk_query",
        },
      } as Record<string, unknown>)
      .eq("id", (tx as { id: string }).id)
      .eq("status", "pending");

    if (failUpErr) {
      return NextResponse.json({ ok: false, error: failUpErr.message }, { status: 500 });
    }

    void notifyCampaignOwnerPaymentIncomplete(supabase, {
      campaignId: String((tx as { campaign_id: string }).campaign_id),
      reference: String((tx as { reference: string }).reference),
      amount: Number((tx as { amount: number | null }).amount ?? 0),
      currency: String((tx as { currency?: string | null }).currency ?? "KES"),
      provider: "M-Pesa (Daraja)",
      payerEmail: (tx as { email?: string | null }).email,
      payerName: (tx as { payer_name?: string | null }).payer_name,
      reason: resultDesc ? `M-Pesa (STK query): ${resultDesc}` : `M-Pesa STK query result code ${resultCode}`,
    });
    const toEmail = (tx as { email?: string | null }).email?.trim?.();
    if (toEmail) {
      sendPurchaseReminderByRef(String((tx as { reference: string }).reference), supabase).catch((err) =>
        console.warn("[Daraja verify-ref] Purchase reminder email error:", err instanceof Error ? err.message : err)
      );
    }

    return NextResponse.json({
      ok: true,
      status: "failed",
      completed: false,
      daraja_result_code: resultCode,
      daraja_result_desc: resultDesc,
    });
  }

  const { data: tx2 } = await supabase
    .from("transactions")
    .select(
      "id,campaign_id,campaign_type,contestant_id,quantity,amount,currency,reference,status,fulfilled_at,metadata,email,payer_name,coupon_id"
    )
    .eq("reference", ref)
    .maybeSingle();

  if (!tx2) {
    return NextResponse.json({ ok: false, error: "Transaction disappeared" }, { status: 500 });
  }
  const st2 = String((tx2 as { status?: string }).status ?? "pending");
  const canFinalize = canAutoReconcileDarajaStkQuery(st2);
  if (!canFinalize) {
    if (st2 === "success") {
      schedulePaymentEmailsAfterResponse(supabase, String((tx2 as { id: string }).id), "[Daraja verify-ref]");
    }
    return NextResponse.json({ ok: true, status: st2, completed: st2 === "success" });
  }

  const fin = await finalizeDarajaStkFromMetadataItems(supabase, tx2, items, "[Daraja verify-ref]");

  return NextResponse.json({
    ok: true,
    status: fin === "amount_mismatch" ? "failed" : "success",
    completed: fin === "completed",
  });
}
