import type { SupabaseClient } from "@supabase/supabase-js";

import {
  finalizeDarajaStkFromMetadataItems,
  type CallbackMetadataItem,
} from "@/lib/daraja-finalize-stk-from-items";
import { fetchDarajaAccessToken } from "@/lib/daraja-oauth";
import {
  buildDarajaStkPassword,
  darajaStkTimestamp,
  parseMpesaBusinessShortCode,
} from "@/lib/daraja-stk-config";
import {
  isStkQueryStillPending,
  wasPrematureDarajaVerifyRefFailure,
} from "@/lib/daraja-stk-result";
import { notifyCampaignOwnerPaymentIncomplete } from "@/lib/notify-campaign-owner-payment-incomplete";
import { sendPurchaseReminderByRef } from "@/lib/send-purchase-reminder";

export type DarajaTxRow = {
  id: string;
  reference: string;
  campaign_id: string;
  campaign_type: string;
  contestant_id: string | null;
  quantity: number;
  amount: number;
  currency: string;
  status: string;
  fulfilled_at: string | null;
  metadata: unknown;
  email: string | null;
  payer_name: string | null;
  coupon_id: string | null;
  created_at?: string | null;
};

export type DarajaReconcileOutcome =
  | { result: "success" }
  | { result: "failed" }
  | { result: "pending"; reason: string }
  | { result: "skipped"; reason: string }
  | { result: "error"; message: string };

const STALE_NO_CHECKOUT_MS = 20 * 60 * 1000;

function parseStkQueryResult(body: unknown): {
  parseOk: boolean;
  resultCode: number;
  resultDesc: string;
  items: CallbackMetadataItem[];
} {
  if (!body || typeof body !== "object") {
    return { parseOk: false, resultCode: -1, resultDesc: "", items: [] };
  }
  const o = body as Record<string, unknown>;
  const inner = (o.Result as Record<string, unknown>) ?? o["result"];
  const root = inner && typeof inner === "object" ? (inner as Record<string, unknown>) : o;
  const rcRaw = root.ResultCode ?? root.resultCode ?? o.ResultCode;
  if (rcRaw === undefined || rcRaw === null || rcRaw === "") {
    return { parseOk: false, resultCode: -1, resultDesc: "", items: [] };
  }
  const resultCode = Number(rcRaw);
  if (!Number.isFinite(resultCode)) {
    return { parseOk: false, resultCode: -1, resultDesc: "", items: [] };
  }
  const rdRaw =
    root.ResultDesc ?? root.resultDesc ?? o.ResultDesc ?? o.ResponseDescription ?? o.responseDescription;
  const resultDesc = String(rdRaw ?? "");
  const meta = (root.CallbackMetadata ?? o.CallbackMetadata) as { Item?: CallbackMetadataItem[] } | undefined;
  return { parseOk: true, resultCode, resultDesc, items: meta?.Item ?? [] };
}

function txMeta(tx: DarajaTxRow): Record<string, unknown> {
  return typeof tx.metadata === "object" && tx.metadata !== null && !Array.isArray(tx.metadata)
    ? { ...(tx.metadata as Record<string, unknown>) }
    : {};
}

async function markDarajaFailed(
  supabase: SupabaseClient,
  tx: DarajaTxRow,
  patch: Record<string, unknown>,
  notifyReason: string
): Promise<boolean> {
  const { error } = await supabase
    .from("transactions")
    .update({
      status: "failed",
      verified_at: new Date().toISOString(),
      metadata: { ...txMeta(tx), ...patch },
    } as Record<string, unknown>)
    .eq("id", tx.id)
    .in("status", ["pending", "failed"]);

  if (error) return false;

  void notifyCampaignOwnerPaymentIncomplete(supabase, {
    campaignId: String(tx.campaign_id),
    reference: String(tx.reference),
    amount: Number(tx.amount ?? 0),
    currency: String(tx.currency ?? "KES"),
    provider: "M-Pesa (Daraja)",
    payerEmail: tx.email,
    payerName: tx.payer_name,
    reason: notifyReason,
  });
  const toEmail = tx.email?.trim?.();
  if (toEmail) {
    sendPurchaseReminderByRef(tx.reference, supabase).catch(() => {});
  }
  return true;
}

/**
 * Query Safaricom for one pending/failed-premature Daraja row and finalize or mark terminal.
 */
export async function reconcileDarajaPendingTransaction(
  supabase: SupabaseClient,
  tx: DarajaTxRow,
  options?: { reconciledVia?: string }
): Promise<DarajaReconcileOutcome> {
  const reconciledVia = options?.reconciledVia ?? "daraja_sync_pending";

  const status = String(tx.status ?? "pending");
  const meta = txMeta(tx);
  const canReconcile =
    status === "pending" || (status === "failed" && wasPrematureDarajaVerifyRefFailure(meta));
  if (!canReconcile) {
    return { result: "skipped", reason: `already ${status}` };
  }

  const checkoutRequestId = String(meta.checkout_request_id ?? "").trim();
  if (!checkoutRequestId) {
    const created = tx.created_at ? Date.parse(String(tx.created_at)) : NaN;
    const ageMs = Number.isNaN(created) ? STALE_NO_CHECKOUT_MS + 1 : Date.now() - created;
    if (ageMs >= STALE_NO_CHECKOUT_MS) {
      const ok = await markDarajaFailed(
        supabase,
        tx,
        {
          daraja_result_desc: "No M-Pesa checkout id was stored; payment cannot be confirmed.",
          reconciled_via: reconciledVia,
          stale_no_checkout: true,
        },
        "M-Pesa: checkout was never linked to this order"
      );
      return ok ? { result: "failed" } : { result: "error", message: "Could not mark stale row failed" };
    }
    return { result: "pending", reason: "missing checkout_request_id" };
  }

  const consumerKey = process.env.MPESA_CONSUMER_KEY;
  const consumerSecret = process.env.MPESA_CONSUMER_SECRET;
  const shortCode = process.env.MPESA_SHORTCODE;
  const passKey = process.env.MPESA_PASSKEY;
  const baseUrl = (process.env.MPESA_BASE_URL ?? "https://sandbox.safaricom.co.ke").replace(/\/$/, "");
  const stkQueryUrl = process.env.MPESA_STKPUSH_QUERY_URL ?? `${baseUrl}/mpesa/stkpushquery/v1/query`;

  if (!consumerKey || !consumerSecret || !shortCode || !passKey) {
    return { result: "error", message: "M-Pesa not configured" };
  }

  const businessShortCode = parseMpesaBusinessShortCode(shortCode);
  if (!businessShortCode) {
    return { result: "error", message: "Invalid MPESA_SHORTCODE" };
  }

  const tokenResult = await fetchDarajaAccessToken();
  if (!tokenResult.ok) {
    return { result: "error", message: tokenResult.error };
  }

  const timestamp = darajaStkTimestamp();
  const password = buildDarajaStkPassword(businessShortCode, passKey, timestamp);

  const queryRes = await fetch(stkQueryUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${tokenResult.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      BusinessShortCode: businessShortCode,
      Password: password,
      Timestamp: timestamp,
      CheckoutRequestID: checkoutRequestId,
    }),
  });

  const queryJson: unknown = await queryRes.json().catch(() => ({}));
  if (!queryRes.ok) {
    return { result: "error", message: `Daraja STK query HTTP ${queryRes.status}` };
  }

  const parsed = parseStkQueryResult(queryJson);
  if (!parsed.parseOk) {
    return { result: "error", message: "Could not parse Daraja STK query response" };
  }

  const { resultCode, resultDesc, items } = parsed;

  if (resultCode !== 0) {
    if (isStkQueryStillPending(resultCode, resultDesc, items)) {
      const created = tx.created_at ? Date.parse(String(tx.created_at)) : NaN;
      const ageMs = Number.isNaN(created) ? 0 : Date.now() - created;
      if (ageMs >= 60 * 60 * 1000) {
        const ok = await markDarajaFailed(
          supabase,
          tx,
          {
            daraja_result_code: resultCode,
            daraja_result_desc: resultDesc || "STK still pending after 1 hour",
            reconciled_via: reconciledVia,
            stale_stk_pending: true,
          },
          resultDesc ? `M-Pesa (STK query): ${resultDesc}` : `M-Pesa STK query code ${resultCode}`
        );
        return ok ? { result: "failed" } : { result: "error", message: "Could not mark stale STK failed" };
      }
      return { result: "pending", reason: resultDesc || `STK code ${resultCode}` };
    }

    const ok = await markDarajaFailed(
      supabase,
      tx,
      {
        daraja_result_code: resultCode,
        daraja_result_desc: resultDesc,
        reconciled_via: reconciledVia,
      },
      resultDesc ? `M-Pesa (STK query): ${resultDesc}` : `M-Pesa STK query result code ${resultCode}`
    );
    return ok ? { result: "failed" } : { result: "error", message: "Could not mark failed" };
  }

  const { data: tx2 } = await supabase
    .from("transactions")
    .select(
      "id,campaign_id,campaign_type,contestant_id,quantity,amount,currency,reference,status,fulfilled_at,metadata,email,payer_name,coupon_id"
    )
    .eq("id", tx.id)
    .maybeSingle();

  if (!tx2) return { result: "error", message: "Transaction disappeared" };

  const st2 = String((tx2 as DarajaTxRow).status ?? "pending");
  const meta2 = txMeta(tx2 as DarajaTxRow);
  const canFinalize =
    st2 === "pending" || (st2 === "failed" && wasPrematureDarajaVerifyRefFailure(meta2));
  if (!canFinalize) {
    return st2 === "success" ? { result: "success" } : { result: "skipped", reason: `now ${st2}` };
  }

  const fin = await finalizeDarajaStkFromMetadataItems(
    supabase,
    tx2,
    items,
    `[${reconciledVia}]`
  );

  if (fin === "completed") return { result: "success" };
  if (fin === "amount_mismatch") return { result: "failed" };
  return { result: "error", message: "Finalize did not complete" };
}
