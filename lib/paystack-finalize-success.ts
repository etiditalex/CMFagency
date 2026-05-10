import type { SupabaseClient } from "@supabase/supabase-js";
import { applyLipaPolePolePaymentSuccess, isLipaPolePoleMetadata } from "@/lib/lipa-pole-pole";
import { markServiceInvoicePaid } from "@/lib/service-invoice-paid";

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
 * Sets transaction to success and fulfills votes/tickets.
 * Vote/ticket upserts run even when fulfilled_at is already set (repairs rows missing
 * due to DB errors, ignoreDuplicates bugs, or old code that marked fulfilled without a vote).
 * Uses merge upsert on transaction_id (not ignoreDuplicates).
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
  const metaBase: Record<string, unknown> =
    typeof tx.metadata === "object" && tx.metadata && !Array.isArray(tx.metadata)
      ? { ...(tx.metadata as Record<string, unknown>) }
      : {};

  const metaForSuccess: Record<string, unknown> = { ...metaBase, ...options.metadataPatch };
  delete metaForSuccess.fulfillment_error;

  const { data: updatedRows, error: statusErr } = await supabase
    .from("transactions")
    .update({
      status: "success",
      verified_at: new Date().toISOString(),
      paid_at: paidAt,
      metadata: metaForSuccess,
    } as Record<string, unknown>)
    .eq("id", tx.id)
    .select("id");

  if (statusErr) {
    console.error("[finalizePaystack] status update error:", statusErr.message);
    return { fulfillErr: statusErr.message };
  }
  if (!updatedRows?.length) {
    console.error("[finalizePaystack] status update matched no rows for id:", tx.id);
    return { fulfillErr: "transaction_status_update_no_rows" };
  }

  if (metaBase.merchandise_cart === true) {
    if (!tx.fulfilled_at) {
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
    }
    return { fulfillErr: null };
  }

  if (isLipaPolePoleMetadata(metaForSuccess)) {
    const lipa = await applyLipaPolePolePaymentSuccess({
      supabase,
      transactionId: tx.id,
      campaignId: tx.campaign_id,
      paymentAmountKes: Number(tx.amount ?? 0),
      metadataBase: metaForSuccess,
    });
    const mergedMeta = { ...metaForSuccess, ...lipa.metadataExtra };
    if (lipa.fulfillErr) {
      await supabase
        .from("transactions")
        .update({
          metadata: { ...mergedMeta, fulfillment_error: lipa.fulfillErr },
        } as Record<string, unknown>)
        .eq("id", tx.id);
      return { fulfillErr: lipa.fulfillErr };
    }
    await supabase
      .from("transactions")
      .update({ metadata: mergedMeta } as Record<string, unknown>)
      .eq("id", tx.id);
    if (!tx.fulfilled_at) {
      await supabase
        .from("transactions")
        .update({ fulfilled_at: new Date().toISOString() } as Record<string, unknown>)
        .eq("id", tx.id)
        .is("fulfilled_at", null);
    }
    return { fulfillErr: null };
  }

  if (metaForSuccess.service_invoice_id) {
    const paid = await markServiceInvoicePaid(supabase, String(metaForSuccess.service_invoice_id), tx.id);
    if (!paid.ok) {
      console.error("[finalizePaystack] service invoice mark failed:", paid.error);
    }
    if (!tx.fulfilled_at) {
      await supabase
        .from("transactions")
        .update({ fulfilled_at: new Date().toISOString() } as Record<string, unknown>)
        .eq("id", tx.id)
        .is("fulfilled_at", null);
    }
    return { fulfillErr: null };
  }

  let fulfillErr: string | null = null;

  if (tx.campaign_type === "vote") {
    if (!tx.contestant_id) {
      fulfillErr = "vote_missing_contestant_id";
    } else {
      // contestant_id is stored on the transaction at checkout (Paystack init / M-Pesa STK); same id is written here.
      const { error: vErr } = await supabase.from("votes").upsert(
        {
          transaction_id: tx.id,
          campaign_id: tx.campaign_id,
          contestant_id: tx.contestant_id,
          votes: tx.quantity,
        },
        { onConflict: "transaction_id" }
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
      { onConflict: "transaction_id" }
    );
    if (tErr) fulfillErr = tErr.message;
  }

  if (fulfillErr) {
    await supabase
      .from("transactions")
      .update({
        metadata: Object.assign({}, metaForSuccess, { fulfillment_error: fulfillErr }),
      } as Record<string, unknown>)
      .eq("id", tx.id);
    return { fulfillErr };
  }

  if (!tx.fulfilled_at) {
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
  }

  return { fulfillErr: null };
}
