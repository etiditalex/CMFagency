import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import ReceiptContent from "./ReceiptContent";
import PrintButton from "./PrintButton";

type Props = { searchParams: Promise<{ ref?: string }> };

export default async function ReceiptPage({ searchParams }: Props) {
  const params = await searchParams;
  const ref = (params.ref ?? "").trim();
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
    .select("reference, status, payer_name, amount, currency, quantity, campaign_type, metadata, provider")
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
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
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
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
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

  return (
    <div className="min-h-screen bg-gray-100 print:bg-white">
      <div className="max-w-xl mx-auto py-8 px-4 print:py-4">
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-center text-green-800 text-sm print:hidden">
          A copy of this receipt has been sent to your email. You can download or print it below.
        </div>
        <div className="mb-6 flex justify-between items-center print:hidden">
          <Link href="/" className="text-[#B8860B] font-medium hover:underline">← Back to home</Link>
          <PrintButton />
        </div>
        <ReceiptContent
          campaignTitle={campaignTitle}
          typeLabel={typeLabel}
          ticketNumber={ticketNumber}
          holderName={holderName}
          amount={`${currency} ${amount.toLocaleString()}`}
          quantity={`${quantity} ${quantityLabel}`}
          reference={ref}
          mpesaReceipt={isMpesa ? mpesaReceipt : undefined}
          eventLocation={eventLocation}
          eventDate={eventDate}
          eventTime={eventTime}
        />
      </div>
    </div>
  );
}
