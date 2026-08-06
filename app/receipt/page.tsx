import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import VoteSuccessToast from "@/components/VoteSuccessToast";
import ReceiptConfirmingPoller from "@/components/ReceiptConfirmingPoller";
import ReceiptContent, { type LipaReceiptBalance } from "./ReceiptContent";
import { fetchContestantNameById } from "@/lib/contestant-name-for-receipt";
import PrintButton from "./PrintButton";

type Props = { searchParams: Promise<{ ref?: string; vote?: string; slug?: string }> };

function voteReceiptQuery(ref: string, slug: string) {
  return `ref=${encodeURIComponent(ref)}&vote=1&slug=${encodeURIComponent(slug)}`;
}

/** Shown while a vote payment is still pending — no thank-you or success copy until status is confirmed. */
function VotePaymentConfirmingMessage({
  paymentRef,
  slug,
}: {
  paymentRef: string;
  slug: string | null;
}) {
  const hasCampaignSlug = Boolean(slug && slug !== "event");
  const receiptHref = hasCampaignSlug
    ? `/receipt?${voteReceiptQuery(paymentRef, slug!)}`
    : `/receipt?ref=${encodeURIComponent(paymentRef)}`;

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <ReceiptConfirmingPoller paymentRef={paymentRef} />
      <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
        <h1 className="text-xl font-semibold text-gray-800 mb-3">Confirming your payment</h1>
        <p className="text-gray-600 mb-3">
          We&apos;re verifying your payment with your provider. This usually takes a moment — you&apos;ll see your
          receipt here once it&apos;s fully processed.
        </p>
        <p className="text-gray-600 text-sm mb-6">
          You can check back shortly, or use the link from your email or SMS when it arrives.
        </p>
        {hasCampaignSlug && (
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-stretch mb-5">
            <Link
              href={`/${encodeURIComponent(slug!)}`}
              className="inline-flex items-center justify-center rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700"
            >
              Vote again
            </Link>
            <Link
              href={`/${encodeURIComponent(slug!)}#vote-counts`}
              className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-900 hover:bg-gray-50"
            >
              View votes
            </Link>
          </div>
        )}
        <Link href={receiptHref} className="text-[#B8860B] font-medium hover:underline">
          Check receipt again
        </Link>
      </div>
    </div>
  );
}

export default async function ReceiptPage({ searchParams }: Props) {
  const params = await searchParams;
  const ref = (params.ref ?? "").trim();
  const voteFromQuery = params.vote === "1" || params.vote === "true";
  const slugFromQuery = (params.slug ?? "").trim();
  if (!ref) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
          <h1 className="text-xl font-semibold text-gray-800 mb-2">Receipt not found</h1>
          <p className="text-gray-600 mb-4">Missing reference. Use the link from your receipt email.</p>
          <Link href="/" className="text-[#B8860B] font-medium hover:underline">Back to home</Link>
        </div>
      </div>
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
          <p className="text-gray-600">Server configuration error.</p>
        </div>
      </div>
    );
  }

  const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });
  const { data: tx, error } = await supabase
    .from("transactions")
    .select("reference, status, payer_name, amount, currency, quantity, campaign_type, metadata, provider, contestant_id")
    .eq("reference", ref)
    .maybeSingle();

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
          <h1 className="text-xl font-semibold text-gray-800 mb-2">Something went wrong</h1>
          <p className="text-gray-600 mb-4">We couldn&apos;t load your receipt. Please try again or use the link from your email.</p>
          <Link href="/" className="text-[#B8860B] font-medium hover:underline">Back to home</Link>
        </div>
      </div>
    );
  }

  if (!tx) {
    if (voteFromQuery) {
      return <VotePaymentConfirmingMessage paymentRef={ref} slug={slugFromQuery || null} />;
    }
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <ReceiptConfirmingPoller paymentRef={ref} />
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
          <h1 className="text-xl font-semibold text-gray-800 mb-2">Payment processing</h1>
          <p className="text-gray-600 mb-4">Your payment is being confirmed. A receipt will be sent to your email shortly. You can check back in a moment or use the link in the confirmation email.</p>
          <Link href={`/receipt?ref=${encodeURIComponent(ref)}`} className="inline-block mt-2 text-[#B8860B] font-medium hover:underline">Check receipt again</Link>
          <span className="mx-2">·</span>
          <Link href="/" className="text-[#B8860B] font-medium hover:underline">Back to home</Link>
        </div>
      </div>
    );
  }

  const status = (tx as { status?: string }).status ?? "pending";
  if (status === "failed" || status === "abandoned") {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
          <h1 className="text-xl font-semibold text-gray-800 mb-2">Payment not completed</h1>
          <p className="text-gray-600 mb-4">This payment did not go through. You have not been charged. You can try again from the event or ticket page.</p>
          <Link href="/events/upcoming" className="text-[#B8860B] font-medium hover:underline">View events</Link>
          <span className="mx-2">·</span>
          <Link href="/" className="text-[#B8860B] font-medium hover:underline">Back to home</Link>
        </div>
      </div>
    );
  }

  if (status !== "success") {
    const isVotePending = (tx as { campaign_type?: string }).campaign_type === "vote";
    const metaPending =
      (typeof (tx as { metadata?: unknown }).metadata === "object" &&
        (tx as { metadata?: Record<string, unknown> }).metadata) ||
      {};
    const slugPending = ((metaPending.slug as string) || "").trim() || null;
    if (isVotePending) {
      const slugForVote =
        slugPending && slugPending !== "event"
          ? slugPending
          : slugFromQuery && slugFromQuery !== "event"
            ? slugFromQuery
            : null;
      return <VotePaymentConfirmingMessage paymentRef={ref} slug={slugForVote} />;
    }

    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <ReceiptConfirmingPoller paymentRef={ref} />
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
          <h1 className="text-xl font-semibold text-gray-800 mb-2">Payment received</h1>
          <p className="text-gray-600 mb-4">We&apos;re confirming your payment. A receipt will be sent to your email shortly. You can also check back in a moment to download it here.</p>
          <Link href={`/receipt?ref=${encodeURIComponent(ref)}`} className="inline-block mt-2 text-[#B8860B] font-medium hover:underline">Check receipt again</Link>
          <span className="mx-2">·</span>
          <Link href="/" className="text-[#B8860B] font-medium hover:underline">Back to home</Link>
        </div>
      </div>
    );
  }

  const meta = (typeof (tx as { metadata?: unknown }).metadata === "object" && (tx as { metadata?: Record<string, unknown> }).metadata) || {};
  const slug = (meta.slug as string) || "event";
  const ticketSuffix = ref.replace(/^cmf_/, "").slice(-8).toUpperCase();
  const prefix = String(slug).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
  const typeCode = (tx as { campaign_type?: string }).campaign_type === "vote" ? "VOT" : meta.merchandise_cart ? "ORD" : "TKT";
  const ticketNumber = `${prefix}-${typeCode}-${ticketSuffix}`;
  const campaignTitle = (meta.campaign_title as string) || slug;
  const typeLabel = (tx as { campaign_type?: string }).campaign_type === "vote" ? "Vote" : meta.merchandise_cart ? "Order" : "Ticket";
  const quantityLabel = (tx as { campaign_type?: string }).campaign_type === "vote" ? "votes" : meta.merchandise_cart ? "items" : "tickets";
  const holderName = (tx as { payer_name?: string | null }).payer_name?.trim?.() || "—";
  const currency = String((tx as { currency?: string }).currency || "KES").toUpperCase();
  const amount = Number((tx as { amount?: number }).amount || 0);
  const quantity = (tx as { quantity?: number }).quantity ?? 0;
  const mpesaReceipt = (meta.mpesa_receipt as string)?.trim() || undefined;
  const isMpesa = (tx as { provider?: string }).provider === "daraja";

  const isVoteReceipt = (tx as { campaign_type?: string }).campaign_type === "vote";
  const contestantId = (tx as { contestant_id?: string | null }).contestant_id ?? null;

  /**
   * Event details and the voted-for contestant depend only on the transaction we already have,
   * so they run alongside the installment lookup below instead of after it.
   */
  const eventRowPromise =
    slug && slug !== "event"
      ? Promise.resolve(
          supabase
            .from("fusion_events")
            .select("location, venue, event_date, time")
            .eq("ticket_campaign_slug", slug)
            .maybeSingle()
        )
          .then((r) => r.data)
          .catch(() => null)
      : Promise.resolve(null);

  const votedForNamePromise = isVoteReceipt
    ? fetchContestantNameById(supabase, contestantId).catch(() => undefined)
    : Promise.resolve(undefined);

  const isLipaPolePole = meta.lipa_pole_pole === true;
  let lipaBalance: LipaReceiptBalance | null = null;
  if (isLipaPolePole && (tx as { campaign_type?: string }).campaign_type === "ticket") {
    const totalDue = Number(meta.lipa_pole_pole_total_due_kes);
    const paid = Number(meta.lipa_pole_pole_amount_paid_kes);
    const balance = Number(meta.lipa_pole_pole_balance_remaining_kes);
    const completed = Boolean(meta.lipa_pole_pole_plan_completed);
    const ticketQtyMeta = Number(meta.lipa_pole_pole_ticket_quantity);
    const ticketQuantity =
      Number.isFinite(ticketQtyMeta) && ticketQtyMeta > 0 ? ticketQtyMeta : quantity;

    if (Number.isFinite(totalDue) && Number.isFinite(paid) && Number.isFinite(balance)) {
      lipaBalance = {
        totalDueKes: totalDue,
        paidKes: paid,
        balanceKes: balance,
        completed,
        ticketQuantity,
      };
    } else {
      const planId = typeof meta.lipa_pole_pole_plan_id === "string" ? meta.lipa_pole_pole_plan_id : "";
      if (planId) {
        const { data: planRow } = await supabase
          .from("cfm_installment_plans")
          .select("total_due, amount_paid, ticket_quantity, status")
          .eq("id", planId)
          .maybeSingle();
        if (planRow) {
          const p = planRow as {
            total_due: number;
            amount_paid: number;
            ticket_quantity: number;
            status: string;
          };
          const bal = Math.max(0, p.total_due - p.amount_paid);
          lipaBalance = {
            totalDueKes: p.total_due,
            paidKes: p.amount_paid,
            balanceKes: bal,
            completed: p.status === "completed" || bal <= 0,
            ticketQuantity: p.ticket_quantity,
          };
        }
      }
    }
  }

  const headerSubtitle = isLipaPolePole
    ? "Lipa Pole Pole — payment confirmed"
    : isMpesa
      ? "M-Pesa payment confirmed"
      : "Payment confirmed";

  const quantityDisplay =
    lipaBalance != null
      ? `${lipaBalance.ticketQuantity} ${lipaBalance.ticketQuantity === 1 ? "ticket" : "tickets"} (package)`
      : `${quantity} ${quantityLabel}`;

  const [eventRow, votedForName] = await Promise.all([eventRowPromise, votedForNamePromise]);

  let eventLocation: string | undefined;
  let eventDate: string | undefined;
  let eventTime: string | undefined;
  if (eventRow) {
    const loc = (eventRow as { location?: string | null }).location;
    const venue = (eventRow as { venue?: string | null }).venue;
    eventLocation = venue && loc ? `${venue}, ${loc}` : loc || venue || undefined;
    const ed = (eventRow as { event_date?: string | null }).event_date;
    if (ed) eventDate = new Date(ed).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
    eventTime = (eventRow as { time?: string | null }).time ?? undefined;
  }

  return (
    <div className="min-h-screen bg-gray-100 print:bg-white">
      <VoteSuccessToast show={isVoteReceipt} />
      <div className="max-w-xl mx-auto py-8 px-4 print:py-4">
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-center text-green-800 text-sm print:hidden">
          {isVoteReceipt && (
            <>
              <p className="font-semibold text-green-900 mb-1">Thank you for voting.</p>
              <p className="font-semibold text-green-900 mb-2">Your payment was successfully processed.</p>
            </>
          )}
          A copy of this receipt has been sent to your email. You can download or print it below.
        </div>
        {(tx as { campaign_type?: string }).campaign_type === "vote" && slug && slug !== "event" && (
          <div className="mb-4 rounded-xl border border-primary-200 bg-primary-50/90 p-4 text-center print:hidden">
            <p className="text-sm font-semibold text-gray-900">What would you like to do next?</p>
            <div className="mt-3 flex flex-col sm:flex-row gap-3 justify-center sm:items-stretch">
              <Link
                href={`/${encodeURIComponent(slug)}`}
                className="inline-flex items-center justify-center rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700"
              >
                Vote again
              </Link>
              <Link
                href={`/${encodeURIComponent(slug)}#vote-counts`}
                className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-900 hover:bg-gray-50"
              >
                View votes
              </Link>
            </div>
          </div>
        )}
        <div
          className={`mb-6 flex items-center gap-4 print:hidden ${
            isVoteReceipt && slug && slug !== "event" ? "justify-end" : "justify-between"
          }`}
        >
          {!(isVoteReceipt && slug && slug !== "event") && (
            <Link href="/" className="text-[#B8860B] font-medium hover:underline">← Back to home</Link>
          )}
          <PrintButton />
        </div>
        <ReceiptContent
          campaignTitle={campaignTitle}
          typeLabel={typeLabel}
          ticketNumber={ticketNumber}
          holderName={holderName}
          amount={`${currency} ${amount.toLocaleString()}`}
          quantity={quantityDisplay}
          reference={ref}
          mpesaReceipt={isMpesa ? mpesaReceipt : undefined}
          votedForName={votedForName}
          eventLocation={eventLocation}
          eventDate={eventDate}
          eventTime={eventTime}
          lipaBalance={lipaBalance}
          headerSubtitle={headerSubtitle}
        />
      </div>
    </div>
  );
}
