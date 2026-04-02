import type { SupabaseClient } from "@supabase/supabase-js";

/** Row shape needed to record Paystack success + fulfill (votes/tickets). */
export type PaystackFulfillmentRow = {
  id: string;
  reference: string;
  campaign_id: string;
  campaign_type: string;
  contestant_id: string | null;
  quantity: number;
  amount: number;
  currency: string;
  fulfilled_at: string | null;
  metadata: unknown;
  coupon_id?: string | null;
  email?: string | null;
  payer_name?: string | null;
};

/**
 * Sets transaction to success and runs the same fulfillment path as the Paystack webhook /
 * sync-pending (idempotent when fulfilled_at is already set).
 */
export async function finalizePaystackTransactionSuccess(
  supabase: SupabaseClient,
  tx: PaystackFulfillmentRow,
  options: {
    paidAt: string | null;
    metadataPatch: Record<string, unknown>;
  }
): Promise<{ fulfillErr: string | null }> {
  const paidAt = options.paidAt ?? new Date().toISOString();
  const metaBase =
    typeof tx.metadata === "object" && tx.metadata && !Array.isArray(tx.metadata)
      ? { ...(tx.metadata as Record<string, unknown>) }
      : {};

  await supabase
    .from("transactions")
    .update({
      status: "success",
      verified_at: new Date().toISOString(),
      paid_at: paidAt,
      metadata: { ...metaBase, ...options.metadataPatch },
    } as Record<string, unknown>)
    .eq("id", tx.id);

  if (tx.fulfilled_at) {
    return { fulfillErr: null };
  }

  const meta = metaBase;
  let fulfillErr: string | null = null;

  if (meta.merchandise_cart === true) {
    await supabase
      .from("transactions")
      .update({ fulfilled_at: new Date().toISOString() } as Record<string, unknown>)
      .eq("id", tx.id)
      .is("fulfilled_at", null);
    const couponId = tx.coupon_id;
    if (couponId) {
      const { data: cou } = await supabase.from("coupons").select("used_count").eq("id", couponId).single();
      if (cou) {
        const nextCount = ((cou as { used_count: number }).used_count ?? 0) + 1;
        await supabase.from("coupons").update({ used_count: nextCount }).eq("id", couponId);
      }
    }
    return { fulfillErr: null };
  }

  if (tx.campaign_type === "vote") {
    if (!tx.contestant_id) {
      fulfillErr = "vote_missing_contestant_id";
    } else {
      const { error: vErr } = await supabase.from("votes").upsert(
        {
          transaction_id: tx.id,
          campaign_id: tx.campaign_id,
          contestant_id: tx.contestant_id,
          votes: tx.quantity,
        },
        { onConflict: "transaction_id", ignoreDuplicates: true }
      );
      if (vErr) fulfillErr = vErr.message;
    }
  } else if (tx.campaign_type === "ticket") {
    const { error: tErr } = await supabase.from("ticket_issues").upsert(
      {
        transaction_id: tx.id,
        campaign_id: tx.campaign_id,
        quantity: tx.quantity,
      },
      { onConflict: "transaction_id", ignoreDuplicates: true }
    );
    if (tErr) fulfillErr = tErr.message;
  }

  if (!fulfillErr) {
    await supabase
      .from("transactions")
      .update({ fulfilled_at: new Date().toISOString() } as Record<string, unknown>)
      .eq("id", tx.id)
      .is("fulfilled_at", null);

    const couponId = tx.coupon_id;
    if (couponId) {
      const { data: cou } = await supabase.from("coupons").select("used_count").eq("id", couponId).single();
      if (cou) {
        const nextCount = ((cou as { used_count: number }).used_count ?? 0) + 1;
        await supabase.from("coupons").update({ used_count: nextCount }).eq("id", couponId);
      }
    }
  } else {
    await supabase
      .from("transactions")
      .update({
        metadata: { ...metaBase, ...options.metadataPatch, fulfillment_error: fulfillErr },
      } as Record<string, unknown>)
      .eq("id", tx.id);
  }

  return { fulfillErr };
}
