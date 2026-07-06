import type { SupabaseClient } from "@supabase/supabase-js";

type DarajaTxRow = {
  id: string;
  campaign_id: string;
  campaign_type: string;
  contestant_id: string | null;
  quantity: number;
  amount: number;
  currency: string;
  reference: string;
  status: string;
  fulfilled_at: string | null;
  metadata: unknown;
  email: string | null;
  payer_name: string | null;
  coupon_id: string | null;
};

const TX_SELECT =
  "id,campaign_id,campaign_type,contestant_id,quantity,amount,currency,reference,status,fulfilled_at,metadata,email,payer_name,coupon_id";

function hasCheckoutRequestId(meta: unknown, checkoutRequestId: string): boolean {
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) return false;
  return String((meta as Record<string, unknown>).checkout_request_id ?? "").trim() === checkoutRequestId;
}

function missingCheckoutRequestId(meta: unknown): boolean {
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) return true;
  return !String((meta as Record<string, unknown>).checkout_request_id ?? "").trim();
}

/**
 * Resolve the transaction for an STK callback. Primary key: metadata.checkout_request_id.
 * Fallback: single recent pending Daraja row still missing checkout_request_id (failed metadata write).
 */
export async function findDarajaTransactionForStkCallback(
  supabase: SupabaseClient,
  checkoutRequestId: string
): Promise<DarajaTxRow | null> {
  const { data: direct } = await supabase
    .from("transactions")
    .select(TX_SELECT)
    .eq("provider", "daraja")
    .in("status", ["pending", "failed"])
    .filter("metadata->>checkout_request_id", "eq", checkoutRequestId)
    .maybeSingle();

  if (direct) return direct as DarajaTxRow;

  const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { data: recent } = await supabase
    .from("transactions")
    .select(TX_SELECT)
    .eq("provider", "daraja")
    .eq("status", "pending")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(8);

  const candidates = ((recent ?? []) as DarajaTxRow[]).filter((row) => missingCheckoutRequestId(row.metadata));
  if (candidates.length !== 1) return null;

  const tx = candidates[0];
  const prevMeta =
    tx.metadata && typeof tx.metadata === "object" && !Array.isArray(tx.metadata)
      ? (tx.metadata as Record<string, unknown>)
      : {};

  const { error: backfillErr } = await supabase
    .from("transactions")
    .update({
      metadata: {
        ...prevMeta,
        checkout_request_id: checkoutRequestId,
        checkout_request_id_backfilled: true,
      },
    } as Record<string, unknown>)
    .eq("id", tx.id)
    .eq("status", "pending");

  if (backfillErr) {
    console.warn("[Daraja callback] Could not backfill checkout_request_id:", backfillErr.message);
    return null;
  }

  return { ...tx, metadata: { ...prevMeta, checkout_request_id: checkoutRequestId } };
}

export async function backfillCheckoutRequestIdIfMissing(
  supabase: SupabaseClient,
  tx: { id: string; metadata?: unknown },
  checkoutRequestId: string
): Promise<void> {
  if (hasCheckoutRequestId(tx.metadata, checkoutRequestId)) return;
  const prevMeta =
    tx.metadata && typeof tx.metadata === "object" && !Array.isArray(tx.metadata)
      ? (tx.metadata as Record<string, unknown>)
      : {};
  await supabase
    .from("transactions")
    .update({
      metadata: { ...prevMeta, checkout_request_id: checkoutRequestId },
    } as Record<string, unknown>)
    .eq("id", tx.id);
}
