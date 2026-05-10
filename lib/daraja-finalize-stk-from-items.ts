import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchContestantNameById } from "@/lib/contestant-name-for-receipt";
import { applyLipaPolePolePaymentSuccess, isLipaPolePoleMetadata } from "@/lib/lipa-pole-pole";
import { notifyCampaignOwnerPaymentIncomplete } from "@/lib/notify-campaign-owner-payment-incomplete";
import { sendReceiptEmail } from "@/lib/send-receipt-email";
import { sendPurchaseReminderByRef } from "@/lib/send-purchase-reminder";
import { sendLipaPolePoleEmail } from "@/lib/send-lipa-pole-pole-email";
import { markServiceInvoicePaid } from "@/lib/service-invoice-paid";
import { sendServiceInvoicePaidEmail } from "@/lib/send-service-invoice-email";

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

/**
 * Completes an M-Pesa STK payment from CallbackMetadata items (callback or STK Query).
 * Idempotent for already-success rows if called with same data.
 *
 * @returns "amount_mismatch" if payment was marked failed due to amount (caller should ACK Safaricom)
 * @returns "completed" when the success path finished (including receipt email)
 */
export async function finalizeDarajaStkFromMetadataItems(
  supabase: SupabaseClient,
  tx: DarajaFinalizeTxRow,
  items: CallbackMetadataItem[],
  logPrefix = "[Daraja]"
): Promise<"amount_mismatch" | "completed"> {
  const { data: already } = await supabase.from("transactions").select("status").eq("id", tx.id).maybeSingle();
  if (already && String((already as { status?: string }).status ?? "") === "success") {
    return "completed";
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

    const toEmail = tx.email?.trim?.();
    if (toEmail) {
      const { data: invRow } = await supabase
        .from("service_invoices")
        .select("invoice_number,package_title,amount_kes,customer_name")
        .eq("id", invId)
        .maybeSingle();
      const ir = invRow as { invoice_number?: number; package_title?: string; amount_kes?: number; customer_name?: string } | null;
      const label = ir?.invoice_number != null ? `CF-${new Date().getFullYear()}-${String(ir.invoice_number).padStart(6, "0")}` : invId.slice(0, 8);
      void sendServiceInvoicePaidEmail({
        to: toEmail,
        customerName: ir?.customer_name ?? tx.payer_name?.trim?.() ?? toEmail,
        invoiceLabel: label,
        packageTitle: ir?.package_title ?? "Service package",
        amountKes: Number(ir?.amount_kes ?? tx.amount ?? 0),
        reference: String(tx.reference),
      }).catch((err) => console.warn(`${logPrefix} service invoice paid email:`, err instanceof Error ? err.message : err));
    }
    return "completed";
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
    const toEmail = tx.email?.trim?.();
    if (toEmail && !lipa.fulfillErr) {
      const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://cmfagency.co.ke").replace(/\/$/, "");
      const continueUrl = `${baseUrl}/kcm/cfm-tickets`;
      const bal = Number(lipa.metadataExtra.lipa_pole_pole_balance_remaining_kes ?? 0);
      const paidTot = Number(lipa.metadataExtra.lipa_pole_pole_amount_paid_kes ?? 0);
      const totalDue = Number(lipa.metadataExtra.lipa_pole_pole_total_due_kes ?? 0);
      void sendLipaPolePoleEmail({
        to: toEmail,
        holderName: tx.payer_name?.trim?.() || toEmail,
        campaignTitle: String((updatedMeta as Record<string, unknown>).campaign_title ?? (updatedMeta as Record<string, unknown>).slug ?? "CFM Tickets"),
        totalDueKes: totalDue,
        paidKes: paidTot,
        balanceKes: bal,
        continueUrl,
        variant: "partial_paid",
      }).catch((err) =>
        console.warn(`${logPrefix} Lipa Pole Pole email:`, err instanceof Error ? err.message : err)
      );
    }
    return "completed";
  }

  if (tx.fulfilled_at) {
    if (!meta.merchandise_cart && tx.campaign_type === "vote" && tx.contestant_id) {
      const { data: vRow } = await supabase.from("votes").select("id").eq("transaction_id", tx.id).maybeSingle();
      if (!vRow) {
        await supabase.from("votes").upsert(
          {
            transaction_id: tx.id,
            campaign_id: tx.campaign_id,
            contestant_id: tx.contestant_id,
            votes: tx.quantity,
          },
          { onConflict: "transaction_id" }
        );
      }
    } else if (!meta.merchandise_cart && tx.campaign_type === "ticket") {
      const { data: tRow } = await supabase.from("ticket_issues").select("id").eq("transaction_id", tx.id).maybeSingle();
      if (!tRow) {
        await supabase.from("ticket_issues").upsert(
          {
            transaction_id: tx.id,
            campaign_id: tx.campaign_id,
            quantity: tx.quantity,
          },
          { onConflict: "transaction_id" }
        );
      }
    }
    return "completed";
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

    return "completed";
  }

  if (meta.merchandise_cart === true) {
    await supabase
      .from("transactions")
      .update({ fulfilled_at: new Date().toISOString() } as Record<string, unknown>)
      .eq("id", tx.id)
      .is("fulfilled_at", null);
  } else {
    let fulfillErr: string | null = null;
    if (tx.campaign_type === "vote") {
      if (!tx.contestant_id) {
        fulfillErr = "vote_missing_contestant_id";
        console.error(`${logPrefix} Vote success but contestant_id is null`, tx.id);
      } else {
        const { error: voteErr } = await supabase.from("votes").upsert(
          {
            transaction_id: tx.id,
            campaign_id: tx.campaign_id,
            contestant_id: tx.contestant_id,
            votes: tx.quantity,
          },
          { onConflict: "transaction_id" }
        );
        if (voteErr) {
          fulfillErr = voteErr.message;
          console.error(`${logPrefix} votes upsert failed:`, voteErr.message);
        }
      }
    } else {
      const { error: ticketErr } = await supabase.from("ticket_issues").upsert(
        {
          transaction_id: tx.id,
          campaign_id: tx.campaign_id,
          quantity: tx.quantity,
        },
        { onConflict: "transaction_id" }
      );
      if (ticketErr) {
        fulfillErr = ticketErr.message;
        console.error(`${logPrefix} ticket_issues upsert failed:`, ticketErr.message);
      }
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
          metadata: Object.assign({}, updatedMeta, { fulfillment_error: fulfillErr }),
        } as Record<string, unknown>)
        .eq("id", tx.id);
    }
  }

  await sendDarajaReceiptEmail(supabase, tx, meta, mpesaReceipt, logPrefix);
  return "completed";
}

async function sendDarajaReceiptEmail(
  supabase: SupabaseClient,
  tx: DarajaFinalizeTxRow,
  meta: Record<string, unknown>,
  mpesaReceipt: string,
  logPrefix: string
) {
  const toEmail = tx.email?.trim?.();
  if (!toEmail) return;

  const holderName = tx.payer_name?.trim?.() || toEmail;
  const reference = tx.reference;
  const ticketSuffix = reference.replace(/^cmf_/, "").slice(-8).toUpperCase();
  const slug = String(meta.slug || meta.campaign_slug || "event");
  const prefix = slug.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
  const typeCode = tx.campaign_type === "vote" ? "VOT" : meta.merchandise_cart ? "ORD" : "TKT";
  const ticketNumber = `${prefix}-${typeCode}-${ticketSuffix}`;
  const campaignTitle = String(meta.campaign_title || meta.slug || "Event");
  const typeLabel = (tx.campaign_type === "vote" ? "Vote" : meta.merchandise_cart ? "Order" : "Ticket") as "Ticket" | "Vote" | "Order";
  const quantityLabel = tx.campaign_type === "vote" ? "votes" : meta.merchandise_cart ? "items" : "tickets";
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://cmfagency.co.ke").replace(/\/$/, "");
  const viewTicketsUrl = slug && slug !== "event" ? `${baseUrl}/${slug}?ref=${encodeURIComponent(reference)}` : undefined;
  const downloadReceiptUrl = `${baseUrl}/receipt?ref=${encodeURIComponent(reference)}`;

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
      amount: `KES ${Number(tx.amount || 0).toLocaleString()}`,
      quantity: `${tx.quantity} ${quantityLabel}`,
      reference,
      mpesaReceipt: mpesaReceipt || undefined,
      votedForName,
      variant: "mpesa",
      viewTicketsUrl,
      downloadReceiptUrl,
      eventLocation,
      eventDate,
      eventTime,
    });
    if (emailResult.ok) {
      console.log(`${logPrefix} Receipt email sent via Resend to ${toEmail} (ref: ${reference})`);
    } else {
      console.warn(`${logPrefix} Receipt email failed for ${toEmail}:`, emailResult.error);
    }
  } catch (err) {
    console.warn(`${logPrefix} Receipt email error:`, err instanceof Error ? err.message : err);
  }
}
