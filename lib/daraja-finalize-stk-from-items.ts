import type { SupabaseClient } from "@supabase/supabase-js";
import { applyLipaPolePolePaymentSuccess, isLipaPolePoleMetadata } from "@/lib/lipa-pole-pole";
import { notifyCampaignOwnerPaymentIncomplete } from "@/lib/notify-campaign-owner-payment-incomplete";
import { sendPurchaseReminderByRef } from "@/lib/send-purchase-reminder";
import { schedulePaymentEmailsAfterResponse } from "@/lib/deliver-payment-emails";
import { markServiceInvoicePaid } from "@/lib/service-invoice-paid";
import { fulfillVisitorManagementSubscriptionPayment } from "@/lib/visitors/activate-subscription-payment";
import { isVisitorSubscriptionPaymentMetadata } from "@/lib/visitors/subscription-pricing";
import { upsertVoteOrTicketForSuccessfulTx } from "@/lib/vote-ticket-fulfillment";

export type CallbackMetadataItem = { Name: string; Value: string | number };

export type DarajaFinalizeTxRow = {
  id: string;
  campaign_id: string;
  campaign_type: string;
  contestant_id: string | null;
  quantity: number;
  amount: number | null;
  currency: string | null;
  reference: string;
  status?: string;
  fulfilled_at: string | null;
  metadata: unknown;
  email?: string | null;
  payer_name?: string | null;
  coupon_id?: string | null;
};

function completeWithEmail(supabase: SupabaseClient, transactionId: string, logPrefix: string): "completed" {
  schedulePaymentEmailsAfterResponse(supabase, transactionId, logPrefix);
  return "completed";
}

/**
 * Completes an M-Pesa STK payment from CallbackMetadata items (callback or STK Query).
 * Idempotent for already-success rows if called with same data.
 *
 * @returns "amount_mismatch" if payment was marked failed due to amount (caller should ACK Safaricom)
 * @returns "completed" when the success path finished (receipt email is scheduled after the HTTP ACK)
 */
export async function finalizeDarajaStkFromMetadataItems(
  supabase: SupabaseClient,
  tx: DarajaFinalizeTxRow,
  items: CallbackMetadataItem[],
  logPrefix = "[Daraja]"
): Promise<"amount_mismatch" | "completed"> {
  const { data: existingRow } = await supabase
    .from("transactions")
    .select("id,status,metadata,campaign_id,campaign_type,contestant_id,quantity,fulfilled_at,coupon_id")
    .eq("id", tx.id)
    .maybeSingle();

  if (existingRow && String((existingRow as { status?: string }).status ?? "") === "success") {
    const er = existingRow as {
      metadata?: unknown;
      campaign_id: string;
      campaign_type: string;
      contestant_id: string | null;
      quantity: number;
      fulfilled_at: string | null;
      coupon_id?: string | null;
    };
    const metaRec =
      typeof er.metadata === "object" && er.metadata !== null && !Array.isArray(er.metadata)
        ? (er.metadata as Record<string, unknown>)
        : {};
    if (
      metaRec.merchandise_cart === true ||
      isLipaPolePoleMetadata(metaRec) ||
      metaRec.service_invoice_id ||
      isVisitorSubscriptionPaymentMetadata(metaRec)
    ) {
      if (isVisitorSubscriptionPaymentMetadata(metaRec)) {
        await fulfillVisitorManagementSubscriptionPayment(supabase, { id: tx.id, metadata: metaRec });
      }
      return completeWithEmail(supabase, tx.id, logPrefix);
    }
    const { fulfillErr, effectiveType } = await upsertVoteOrTicketForSuccessfulTx(
      supabase,
      {
        id: tx.id,
        campaign_id: er.campaign_id,
        campaign_type: er.campaign_type,
        contestant_id: er.contestant_id ?? tx.contestant_id,
        quantity: Number(er.quantity ?? tx.quantity),
      },
      logPrefix
    );
    if (fulfillErr) {
      await supabase
        .from("transactions")
        .update({
          metadata: Object.assign({}, metaRec, { fulfillment_error: fulfillErr }),
        } as Record<string, unknown>)
        .eq("id", tx.id);
      return "completed";
    } else if (effectiveType === "vote" || effectiveType === "ticket") {
      if (!er.fulfilled_at) {
        await supabase
          .from("transactions")
          .update({ fulfilled_at: new Date().toISOString() } as Record<string, unknown>)
          .eq("id", tx.id)
          .is("fulfilled_at", null);
        const couponId = er.coupon_id ?? tx.coupon_id;
        if (couponId) {
          const { data: cou } = await supabase.from("coupons").select("used_count").eq("id", couponId).single();
          if (cou) {
            const nextCount = ((cou as { used_count: number }).used_count ?? 0) + 1;
            await supabase.from("coupons").update({ used_count: nextCount }).eq("id", couponId);
          }
        }
      }
    }
    return completeWithEmail(supabase, tx.id, logPrefix);
  }

  const getItem = (name: string) => items.find((i) => i.Name === name)?.Value;
  const mpesaReceipt = String(getItem("MpesaReceiptNumber") ?? "");
  const transactionDate = getItem("TransactionDate");
  const paidAmount = Number(getItem("Amount") ?? tx.amount);

  const expectedAmount = Number(tx.amount);
  if (Math.abs(paidAmount - expectedAmount) > 1) {
    await supabase
      .from("transactions")
      .update({
        status: "failed",
        verified_at: new Date().toISOString(),
        metadata: {
          ...(typeof tx.metadata === "object" && tx.metadata ? tx.metadata : {}),
          daraja_error: "amount_mismatch",
          daraja_amount: paidAmount,
          mpesa_receipt: mpesaReceipt,
        },
      } as Record<string, unknown>)
      .eq("id", tx.id);
    void notifyCampaignOwnerPaymentIncomplete(supabase, {
      campaignId: String(tx.campaign_id),
      reference: String(tx.reference),
      amount: Number(tx.amount),
      currency: String(tx.currency ?? "KES"),
      provider: "M-Pesa (Daraja)",
      payerEmail: tx.email,
      payerName: tx.payer_name,
      reason: `Amount mismatch (paid ${paidAmount}, expected ${expectedAmount})`,
    });
    const toEmailMismatch = tx.email?.trim?.();
    if (toEmailMismatch) {
      sendPurchaseReminderByRef(tx.reference, supabase).catch((err) =>
        console.warn(`${logPrefix} Purchase reminder email error:`, err instanceof Error ? err.message : err)
      );
    }
    return "amount_mismatch";
  }

  const meta: Record<string, unknown> =
    typeof tx.metadata === "object" && tx.metadata && !Array.isArray(tx.metadata)
      ? (tx.metadata as Record<string, unknown>)
      : {};
  const updatedMeta: Record<string, unknown> = {
    ...meta,
    mpesa_receipt: mpesaReceipt,
    daraja_transaction_date: transactionDate,
  };

  await supabase
    .from("transactions")
    .update({
      status: "success",
      verified_at: new Date().toISOString(),
      paid_at: new Date().toISOString(),
      metadata: updatedMeta,
    } as Record<string, unknown>)
    .eq("id", tx.id);

  if (updatedMeta.service_invoice_id) {
    const invId = String(updatedMeta.service_invoice_id);
    const mark = await markServiceInvoicePaid(supabase, invId, tx.id);
    if (!mark.ok) {
      console.error(`${logPrefix} service invoice mark failed:`, mark.error);
    }
    await supabase
      .from("transactions")
      .update({ fulfilled_at: new Date().toISOString() } as Record<string, unknown>)
      .eq("id", tx.id)
      .is("fulfilled_at", null);

    return completeWithEmail(supabase, tx.id, logPrefix);
  }

  if (isLipaPolePoleMetadata(updatedMeta)) {
    const lipa = await applyLipaPolePolePaymentSuccess({
      supabase,
      transactionId: tx.id,
      campaignId: tx.campaign_id,
      paymentAmountKes: paidAmount,
      metadataBase: updatedMeta,
    });
    const mergedMeta = { ...updatedMeta, ...lipa.metadataExtra };
    if (lipa.fulfillErr) {
      await supabase
        .from("transactions")
        .update({
          metadata: { ...mergedMeta, fulfillment_error: lipa.fulfillErr },
        } as Record<string, unknown>)
        .eq("id", tx.id);
    } else {
      await supabase.from("transactions").update({ metadata: mergedMeta } as Record<string, unknown>).eq("id", tx.id);
      await supabase
        .from("transactions")
        .update({ fulfilled_at: new Date().toISOString() } as Record<string, unknown>)
        .eq("id", tx.id)
        .is("fulfilled_at", null);
    }
    if (!lipa.fulfillErr) {
      return completeWithEmail(supabase, tx.id, logPrefix);
    }
    return "completed";
  }

  if (tx.fulfilled_at) {
    if (!meta.merchandise_cart) {
      const { fulfillErr } = await upsertVoteOrTicketForSuccessfulTx(
        supabase,
        {
          id: tx.id,
          campaign_id: tx.campaign_id,
          campaign_type: tx.campaign_type,
          contestant_id: tx.contestant_id,
          quantity: tx.quantity,
        },
        logPrefix
      );
      if (fulfillErr) {
        await supabase
          .from("transactions")
          .update({
            metadata: Object.assign({}, meta, { fulfillment_error: fulfillErr }),
          } as Record<string, unknown>)
          .eq("id", tx.id);
        return "completed";
      }
    }
    return completeWithEmail(supabase, tx.id, logPrefix);
  }

  if (isVisitorSubscriptionPaymentMetadata(meta)) {
    const result = await fulfillVisitorManagementSubscriptionPayment(supabase, {
      id: tx.id,
      metadata: meta,
    });
    if (!result.ok && !result.skipped) {
      await supabase
        .from("transactions")
        .update({
          metadata: Object.assign({}, meta, { fulfillment_error: result.error ?? "subscription_failed" }),
        } as Record<string, unknown>)
        .eq("id", tx.id);
      return "completed";
    }
    return completeWithEmail(supabase, tx.id, logPrefix);
  }

  if (meta.job_board_membership === true && meta.job_board_user_id) {
    const userId = String(meta.job_board_user_id);
    const { data: existingRow } = await supabase
      .from("job_board_memberships")
      .select("valid_until")
      .eq("user_id", userId)
      .maybeSingle();

    const now = new Date();
    let base = now;
    const existingUntil = existingRow && (existingRow as { valid_until?: string }).valid_until;
    if (existingUntil) {
      const prev = new Date(existingUntil);
      if (!Number.isNaN(prev.getTime()) && prev > now) base = prev;
    }
    const newUntil = new Date(base);
    newUntil.setFullYear(newUntil.getFullYear() + 1);

    await supabase.from("job_board_memberships").upsert(
      {
        user_id: userId,
        valid_until: newUntil.toISOString(),
        last_transaction_id: tx.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

    await supabase
      .from("transactions")
      .update({ fulfilled_at: new Date().toISOString() } as Record<string, unknown>)
      .eq("id", tx.id)
      .is("fulfilled_at", null);

    return completeWithEmail(supabase, tx.id, logPrefix);
  }

  if (meta.merchandise_cart === true) {
    await supabase
      .from("transactions")
      .update({ fulfilled_at: new Date().toISOString() } as Record<string, unknown>)
      .eq("id", tx.id)
      .is("fulfilled_at", null);
    return completeWithEmail(supabase, tx.id, logPrefix);
  }

  const { fulfillErr } = await upsertVoteOrTicketForSuccessfulTx(
    supabase,
    {
      id: tx.id,
      campaign_id: tx.campaign_id,
      campaign_type: tx.campaign_type,
      contestant_id: tx.contestant_id,
      quantity: tx.quantity,
    },
    logPrefix
  );

  if (fulfillErr) {
    await supabase
      .from("transactions")
      .update({
        metadata: Object.assign({}, updatedMeta, { fulfillment_error: fulfillErr }),
      } as Record<string, unknown>)
      .eq("id", tx.id);
    return "completed";
  }

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

  return completeWithEmail(supabase, tx.id, logPrefix);
}
