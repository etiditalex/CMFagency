import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendReceiptEmail } from "@/lib/send-receipt-email";

/**
 * Sends the receipt email to the customer (voter/ticket buyer) with
 * vote/ticket number, holder name, and amount. Uses Resend SDK + React template.
 * Called when customer lands on success page - ensures they get the receipt
 * even if webhook Resend isn't configured in Supabase.
 */
export async function POST(req: Request) {
  const url = new URL(req.url);
  const ref = (url.searchParams.get("ref") ?? "").trim();
  if (!ref) return NextResponse.json({ error: "Missing ref" }, { status: 400 });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey)
    return NextResponse.json({ error: "Server config missing" }, { status: 500 });

  const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

  const { data: tx, error } = await supabase
    .from("transactions")
    .select("id,reference,email,payer_name,amount,currency,quantity,campaign_type,metadata")
    .eq("reference", ref)
    .eq("status", "success")
    .maybeSingle();

  if (error || !tx) return NextResponse.json({ error: "Not found or not successful" }, { status: 404 });

  const toEmail = (tx as { email?: string }).email?.trim?.();
  if (!toEmail) return NextResponse.json({ error: "No email" }, { status: 400 });

  const meta = (typeof (tx as { metadata?: unknown }).metadata === "object" && (tx as { metadata?: Record<string, unknown> }).metadata) || {};
  const holderName = (tx as { payer_name?: string }).payer_name?.trim?.() || toEmail;
  const ticketSuffix = ref.replace(/^cmf_/, "").slice(-8).toUpperCase();
  const slug = (meta.slug as string) || "event";
  const prefix = String(slug).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
  const typeCode = (tx as { campaign_type?: string }).campaign_type === "vote" ? "VOT" : meta.merchandise_cart ? "ORD" : "TKT";
  const ticketNumber = `${prefix}-${typeCode}-${ticketSuffix}`;
  const campaignTitle = (meta.campaign_title as string) || slug;
  const typeLabel = ((tx as { campaign_type?: string }).campaign_type === "vote" ? "Vote" : meta.merchandise_cart ? "Order" : "Ticket") as "Ticket" | "Vote" | "Order";
  const quantityLabel = (tx as { campaign_type?: string }).campaign_type === "vote" ? "votes" : meta.merchandise_cart ? "items" : "tickets";
  const currency = String((tx as { currency?: string }).currency || "KES").toUpperCase();
  const amount = Number((tx as { amount?: number }).amount || 0);
  const quantity = (tx as { quantity?: number }).quantity ?? 0;

  const result = await sendReceiptEmail({
    to: toEmail,
    campaignTitle,
    typeLabel,
    ticketNumber,
    holderName,
    amount: `${currency} ${amount.toLocaleString()}`,
    quantity: `${quantity} ${quantityLabel}`,
    reference: ref,
    variant: "paystack",
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? "Email not configured" }, { status: result.error?.includes("not configured") ? 503 : 502 });
  }

  return NextResponse.json({ sent: true });
}
