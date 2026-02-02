import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type DarajaCallbackPayload = {
  Body?: {
    stkCallback?: {
      MerchantRequestID?: string;
      CheckoutRequestID?: string;
      ResultCode?: number;
      ResultDesc?: string;
      CallbackMetadata?: {
        Item?: Array<{ Name?: string; Value?: string | number }>;
      };
    };
  };
};

function getMetaValue(items: Array<{ Name?: string; Value?: string | number }> | undefined, name: string) {
  const it = (items ?? []).find((x) => String(x?.Name ?? "") === name);
  return it?.Value ?? null;
}

type DbTx = {
  id: string;
  campaign_id: string;
  campaign_type: "ticket" | "vote" | string;
  contestant_id: string | null;
  quantity: number;
  amount: number;
  currency: string;
  status: string;
  fulfilled_at: string | null;
  metadata: unknown;
};

function asMeta(obj: unknown): Record<string, unknown> {
  if (obj && typeof obj === "object" && !Array.isArray(obj)) return obj as Record<string, unknown>;
  return {};
}

/**
 * Daraja STK Push callback receiver.
 *
 * IMPORTANT:
 * - Safaricom callbacks generally do not include a cryptographic signature.
 * - We validate a shared secret token in the callback URL (MPESA_CALLBACK_TOKEN).
 *
 * Env required:
 * - NEXT_PUBLIC_SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 * - MPESA_CALLBACK_TOKEN
 */
export async function POST(req: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const callbackToken = process.env.MPESA_CALLBACK_TOKEN;

  if (!supabaseUrl || !supabaseServiceKey || !callbackToken) {
    return new Response("Missing server configuration", { status: 500 });
  }

  const url = new URL(req.url);
  const token = (url.searchParams.get("token") ?? "").trim();
  if (!token || token !== callbackToken) {
    return new Response("Unauthorized", { status: 401 });
  }

  let payload: DarajaCallbackPayload;
  try {
    payload = (await req.json()) as DarajaCallbackPayload;
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const cb = payload?.Body?.stkCallback;
  const checkoutRequestId = String(cb?.CheckoutRequestID ?? "");
  const merchantRequestId = String(cb?.MerchantRequestID ?? "");
  const resultCode = Number(cb?.ResultCode);
  const resultDesc = String(cb?.ResultDesc ?? "");

  if (!checkoutRequestId) {
    // Acknowledge to avoid retries looping forever.
    return NextResponse.json({ ok: true });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });

  // Find our pending transaction by checkout_request_id stored in metadata.
  const { data, error: txErr } = await supabase
    .from("transactions")
    .select("id,campaign_id,campaign_type,contestant_id,quantity,amount,currency,status,fulfilled_at,metadata")
    .eq("metadata->>mpesa_checkout_request_id", checkoutRequestId)
    .maybeSingle();

  const tx = data as unknown as DbTx | null;
  if (txErr || !tx) {
    return NextResponse.json({ ok: true });
  }

  const priorMeta = asMeta(tx.metadata);

  const items = cb?.CallbackMetadata?.Item ?? [];
  const receipt = getMetaValue(items, "MpesaReceiptNumber");
  const paidAmount = getMetaValue(items, "Amount");
  const paidPhone = getMetaValue(items, "PhoneNumber");
  const transactionDate = getMetaValue(items, "TransactionDate");

  const nowIso = new Date().toISOString();

  // Mark verified state first.
  if (resultCode === 0) {
    // Basic consistency check: ensure amount matches.
    const paidAmountNum = Number(paidAmount ?? 0);
    const expectedAmount = Number(tx.amount);
    if (!Number.isFinite(paidAmountNum) || paidAmountNum !== expectedAmount) {
      await supabase
        .from("transactions")
        .update({
          status: "failed",
          verified_at: nowIso,
          metadata: {
            ...priorMeta,
            mpesa_result_code: resultCode,
            mpesa_result_desc: resultDesc,
            mpesa_checkout_request_id: checkoutRequestId,
            mpesa_merchant_request_id: merchantRequestId || null,
            mpesa_receipt: receipt,
            mpesa_paid_amount: paidAmountNum,
            mpesa_paid_phone: paidPhone,
            mpesa_transaction_date: transactionDate,
            webhook_error: "amount_mismatch",
          },
        })
        .eq("id", tx.id);

      return NextResponse.json({ ok: true });
    }

    await supabase
      .from("transactions")
      .update({
        status: "success",
        verified_at: nowIso,
        paid_at: nowIso,
        metadata: {
          ...priorMeta,
          mpesa_result_code: resultCode,
          mpesa_result_desc: resultDesc,
          mpesa_checkout_request_id: checkoutRequestId,
          mpesa_merchant_request_id: merchantRequestId || null,
          mpesa_receipt: receipt,
          mpesa_paid_amount: paidAmountNum,
          mpesa_paid_phone: paidPhone,
          mpesa_transaction_date: transactionDate,
        },
      })
      .eq("id", tx.id);
  } else {
    await supabase
      .from("transactions")
      .update({
        status: "failed",
        verified_at: nowIso,
        metadata: {
          ...priorMeta,
          mpesa_result_code: resultCode,
          mpesa_result_desc: resultDesc,
          mpesa_checkout_request_id: checkoutRequestId,
          mpesa_merchant_request_id: merchantRequestId || null,
        },
      })
      .eq("id", tx.id);

    return NextResponse.json({ ok: true });
  }

  // Idempotency: if already fulfilled, stop.
  if (tx.fulfilled_at) return NextResponse.json({ ok: true });

  // Fulfill based on campaign type (same idempotency pattern as Paystack webhook).
  if (tx.campaign_type === "vote") {
    if (tx.contestant_id) {
      await supabase.from("votes").upsert(
        {
          transaction_id: tx.id,
          campaign_id: tx.campaign_id,
          contestant_id: tx.contestant_id,
          votes: tx.quantity,
        },
        { onConflict: "transaction_id", ignoreDuplicates: true }
      );
    }
  } else {
    await supabase.from("ticket_issues").upsert(
      {
        transaction_id: tx.id,
        campaign_id: tx.campaign_id,
        quantity: tx.quantity,
      },
      { onConflict: "transaction_id", ignoreDuplicates: true }
    );
  }

  await supabase
    .from("transactions")
    .update({ fulfilled_at: nowIso })
    .eq("id", tx.id)
    .is("fulfilled_at", null);

  return NextResponse.json({ ok: true });
}

