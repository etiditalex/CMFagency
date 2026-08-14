import type { SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

import { fetchContestantNameById } from "@/lib/contestant-name-for-receipt";
import { isLipaPolePoleMetadata } from "@/lib/lipa-pole-pole";
import { runAfterResponse } from "@/lib/schedule-after-response";
import { sendLipaPolePoleEmail } from "@/lib/send-lipa-pole-pole-email";
import { sendReceiptEmail, type ReceiptParams } from "@/lib/send-receipt-email";
import { sendServiceInvoicePaidEmail } from "@/lib/send-service-invoice-email";

const SENT_AT = "receipt_email_sent_at";
const CLAIM = "receipt_email_claim";
const SENDING_AT = "receipt_email_sending_at";
const CLAIM_STALE_MS = 45_000;

type TxRow = {
  id: string;
  reference: string;
  status?: string | null;
  email?: string | null;
  payer_name?: string | null;
  amount?: number | null;
  currency?: string | null;
  quantity?: number | null;
  campaign_type?: string | null;
  contestant_id?: string | null;
  provider?: string | null;
  metadata?: unknown;
};

export function asTransactionMeta(raw: unknown): Record<string, unknown> {
  return typeof raw === "object" && raw !== null && !Array.isArray(raw)
    ? { ...(raw as Record<string, unknown>) }
    : {};
}

export function isPaymentEmailAlreadySent(meta: Record<string, unknown>): boolean {
  return typeof meta[SENT_AT] === "string" && String(meta[SENT_AT]).length > 0;
}

async function patchTransactionMetadata(
  supabase: SupabaseClient,
  transactionId: string,
  patch: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const { data } = await supabase.from("transactions").select("metadata").eq("id", transactionId).maybeSingle();
  const next = { ...asTransactionMeta(data?.metadata), ...patch };
  await supabase.from("transactions").update({ metadata: next } as Record<string, unknown>).eq("id", transactionId);
  return next;
}

function claimIsFresh(meta: Record<string, unknown>): boolean {
  const sendingAt = typeof meta[SENDING_AT] === "string" ? Date.parse(String(meta[SENDING_AT])) : NaN;
  if (!Number.isFinite(sendingAt)) return false;
  return Date.now() - sendingAt < CLAIM_STALE_MS;
}

/**
 * Atomically claim the right to send the post-payment email for this transaction.
 * Returns false if another worker already sent or is sending.
 */
async function claimPaymentEmailSend(
  supabase: SupabaseClient,
  tx: TxRow,
  force: boolean
): Promise<{ claimed: boolean; skipped: boolean; meta: Record<string, unknown> }> {
  let meta = asTransactionMeta(tx.metadata);
  if (force) return { claimed: true, skipped: false, meta };
  if (isPaymentEmailAlreadySent(meta)) return { claimed: false, skipped: true, meta };
  if (meta[CLAIM] && claimIsFresh(meta)) return { claimed: false, skipped: true, meta };

  const token = randomUUID();
  const sendingAt = new Date().toISOString();
  await patchTransactionMetadata(supabase, tx.id, {
    [CLAIM]: token,
    [SENDING_AT]: sendingAt,
  });

  const { data: fresh } = await supabase.from("transactions").select("metadata").eq("id", tx.id).maybeSingle();
  meta = asTransactionMeta(fresh?.metadata);
  if (isPaymentEmailAlreadySent(meta)) return { claimed: false, skipped: true, meta };
  if (String(meta[CLAIM] ?? "") !== token) return { claimed: false, skipped: true, meta };
  return { claimed: true, skipped: false, meta };
}

async function markPaymentEmailSent(supabase: SupabaseClient, transactionId: string): Promise<void> {
  await patchTransactionMetadata(supabase, transactionId, {
    [SENT_AT]: new Date().toISOString(),
    [CLAIM]: null,
    [SENDING_AT]: null,
  });
}

async function releasePaymentEmailClaim(supabase: SupabaseClient, transactionId: string): Promise<void> {
  await patchTransactionMetadata(supabase, transactionId, {
    [CLAIM]: null,
    [SENDING_AT]: null,
  });
}

async function loadEventDetails(
  supabase: SupabaseClient,
  slug: string
): Promise<{ eventLocation?: string; eventDate?: string; eventTime?: string }> {
  if (!slug || slug === "event") return {};
  const { data: eventRow } = await supabase
    .from("fusion_events")
    .select("location, venue, event_date, time")
    .eq("ticket_campaign_slug", slug)
    .maybeSingle();
  if (!eventRow) return {};
  const loc = (eventRow as { location?: string | null }).location;
  const venue = (eventRow as { venue?: string | null }).venue;
  const eventLocation = venue && loc ? `${venue}, ${loc}` : loc || venue || undefined;
  const ed = (eventRow as { event_date?: string | null }).event_date;
  const eventDate = ed
    ? new Date(ed).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
    : undefined;
  const eventTime = (eventRow as { time?: string | null }).time ?? undefined;
  return { eventLocation, eventDate, eventTime };
}

async function buildReceiptParams(
  supabase: SupabaseClient,
  tx: TxRow,
  meta: Record<string, unknown>
): Promise<ReceiptParams | null> {
  const toEmail = tx.email?.trim?.();
  if (!toEmail) return null;

  const reference = String(tx.reference);
  const holderName = tx.payer_name?.trim?.() || toEmail;
  const ticketSuffix = reference.replace(/^cmf_/, "").slice(-8).toUpperCase();
  const slug = String(meta.slug || meta.campaign_slug || "event");
  const prefix = slug.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
  const typeCode = tx.campaign_type === "vote" ? "VOT" : meta.merchandise_cart ? "ORD" : "TKT";
  const ticketNumber = `${prefix}-${typeCode}-${ticketSuffix}`;
  const campaignTitle = String(meta.campaign_title || meta.slug || "Event");
  const typeLabel = (tx.campaign_type === "vote" ? "Vote" : meta.merchandise_cart ? "Order" : "Ticket") as
    | "Ticket"
    | "Vote"
    | "Order";
  const quantityLabel = tx.campaign_type === "vote" ? "votes" : meta.merchandise_cart ? "items" : "tickets";
  const isMpesa = String(tx.provider ?? "").toLowerCase() === "daraja";
  const mpesaReceipt = (meta.mpesa_receipt as string)?.trim() || undefined;
  const currency = String(tx.currency || "KES").toUpperCase();
  const amount = Number(tx.amount || 0);
  const quantity = tx.quantity ?? 0;
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://cmfagency.co.ke").replace(/\/$/, "");
  const viewTicketsUrl = slug && slug !== "event" ? `${baseUrl}/${slug}?ref=${encodeURIComponent(reference)}` : undefined;
  const downloadReceiptUrl = `${baseUrl}/receipt?ref=${encodeURIComponent(reference)}`;
  const rsvpUrl = `${baseUrl}/invite?ref=${encodeURIComponent(reference)}`;
  const { eventLocation, eventDate, eventTime } = await loadEventDetails(supabase, slug);
  const votedForName =
    tx.campaign_type === "vote" ? await fetchContestantNameById(supabase, tx.contestant_id) : undefined;

  return {
    to: toEmail,
    campaignTitle,
    campaignSlug: slug !== "event" ? slug : undefined,
    typeLabel,
    ticketNumber,
    holderName,
    amount: `${currency} ${amount.toLocaleString()}`,
    quantity: `${quantity} ${quantityLabel}`,
    reference,
    variant: isMpesa ? "mpesa" : "paystack",
    mpesaReceipt: isMpesa ? mpesaReceipt : undefined,
    votedForName,
    viewTicketsUrl,
    downloadReceiptUrl,
    eventLocation,
    eventDate,
    eventTime,
    rsvpUrl: typeLabel === "Ticket" ? rsvpUrl : undefined,
  };
}

async function sendLipaEmailForTx(
  supabase: SupabaseClient,
  tx: TxRow,
  meta: Record<string, unknown>
): Promise<{ ok: boolean; error?: string }> {
  const toEmail = tx.email?.trim?.();
  if (!toEmail) return { ok: false, error: "No email" };
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://cmfagency.co.ke").replace(/\/$/, "");
  return sendLipaPolePoleEmail({
    to: toEmail,
    holderName: tx.payer_name?.trim?.() || toEmail,
    campaignTitle: String(meta.campaign_title ?? meta.slug ?? "CFM Tickets"),
    totalDueKes: Number(meta.lipa_pole_pole_total_due_kes ?? 0),
    paidKes: Number(meta.lipa_pole_pole_amount_paid_kes ?? 0),
    balanceKes: Number(meta.lipa_pole_pole_balance_remaining_kes ?? 0),
    continueUrl: `${baseUrl}/kcm/cfm-tickets`,
    variant: "partial_paid",
  });
}

async function sendServiceInvoiceEmailForTx(
  supabase: SupabaseClient,
  tx: TxRow,
  meta: Record<string, unknown>
): Promise<{ ok: boolean; error?: string }> {
  const toEmail = tx.email?.trim?.();
  if (!toEmail) return { ok: false, error: "No email" };
  const invId = String(meta.service_invoice_id);
  const { data: invRow } = await supabase
    .from("service_invoices")
    .select("invoice_number,package_title,amount_kes,customer_name")
    .eq("id", invId)
    .maybeSingle();
  const ir = invRow as {
    invoice_number?: number;
    package_title?: string;
    amount_kes?: number;
    customer_name?: string;
  } | null;
  const label =
    ir?.invoice_number != null
      ? `CF-${new Date().getFullYear()}-${String(ir.invoice_number).padStart(6, "0")}`
      : invId.slice(0, 8);
  return sendServiceInvoicePaidEmail({
    to: toEmail,
    customerName: ir?.customer_name ?? tx.payer_name?.trim?.() ?? toEmail,
    invoiceLabel: label,
    packageTitle: ir?.package_title ?? "Service package",
    amountKes: Number(ir?.amount_kes ?? tx.amount ?? 0),
    reference: String(tx.reference),
  });
}

export type DeliverPaymentEmailResult = {
  ok: boolean;
  skipped?: boolean;
  error?: string;
};

/**
 * Send the correct post-payment email at most once per successful transaction.
 * Safe to call from webhooks, verify-ref, and the success-page `/api/send-receipt` fallback.
 */
export async function deliverPaymentEmailsOnce(
  supabase: SupabaseClient,
  opts: { transactionId?: string; reference?: string; force?: boolean; logPrefix?: string }
): Promise<DeliverPaymentEmailResult> {
  const logPrefix = opts.logPrefix ?? "[payment-email]";
  const force = Boolean(opts.force);

  let query = supabase
    .from("transactions")
    .select(
      "id,reference,status,email,payer_name,amount,currency,quantity,campaign_type,contestant_id,provider,metadata"
    );
  if (opts.transactionId) query = query.eq("id", opts.transactionId);
  else if (opts.reference) query = query.eq("reference", opts.reference);
  else return { ok: false, error: "Missing transaction" };

  const { data, error } = await query.maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "Not found" };

  const tx = data as TxRow;
  if (String(tx.status ?? "") !== "success") {
    return { ok: false, error: "Not successful" };
  }
  if (!tx.email?.trim?.()) {
    return { ok: false, skipped: true, error: "No email" };
  }

  const claim = await claimPaymentEmailSend(supabase, tx, force);
  if (!claim.claimed) {
    return { ok: true, skipped: true };
  }

  const meta = claim.meta;
  try {
    let result: { ok: boolean; error?: string };
    if (isLipaPolePoleMetadata(meta)) {
      result = await sendLipaEmailForTx(supabase, tx, meta);
    } else if (meta.service_invoice_id) {
      result = await sendServiceInvoiceEmailForTx(supabase, tx, meta);
    } else {
      const params = await buildReceiptParams(supabase, tx, meta);
      if (!params) {
        await releasePaymentEmailClaim(supabase, tx.id);
        return { ok: false, skipped: true, error: "No email" };
      }
      result = await sendReceiptEmail(params);
    }

    if (result.ok) {
      await markPaymentEmailSent(supabase, tx.id);
      console.log(`${logPrefix} sent to ${tx.email} (ref: ${tx.reference})`);
      return { ok: true };
    }

    await releasePaymentEmailClaim(supabase, tx.id);
    console.warn(`${logPrefix} send failed for ${tx.reference}:`, result.error);
    return { ok: false, error: result.error };
  } catch (e) {
    await releasePaymentEmailClaim(supabase, tx.id);
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.warn(`${logPrefix} send error for ${tx.reference}:`, msg);
    return { ok: false, error: msg };
  }
}

/** ACK the payment webhook/verify first, then send the receipt in the same isolate. */
export function schedulePaymentEmailsAfterResponse(
  supabase: SupabaseClient,
  transactionId: string,
  logPrefix?: string
): void {
  runAfterResponse(
    () => deliverPaymentEmailsOnce(supabase, { transactionId, logPrefix }),
    logPrefix ?? "[payment-email]"
  );
}
