import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { deliverPaymentEmailsOnce } from "@/lib/deliver-payment-emails";

/**
 * Sends the receipt email to the customer (voter/ticket buyer).
 * Idempotent: webhooks also send; this is the instant fallback when the buyer
 * lands on the success page. Duplicate calls are skipped.
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

  const result = await deliverPaymentEmailsOnce(supabase, {
    reference: ref,
    logPrefix: "[send-receipt]",
  });

  if (result.skipped && result.ok) {
    return NextResponse.json({ sent: true, skipped: true });
  }
  if (result.skipped && result.error === "No email") {
    return NextResponse.json({ error: "No email" }, { status: 400 });
  }
  if (!result.ok) {
    const notFound = result.error === "Not found" || result.error === "Not successful";
    if (notFound) return NextResponse.json({ error: "Not found or not successful" }, { status: 404 });
    return NextResponse.json(
      { error: result.error ?? "Email not configured" },
      { status: result.error?.includes("not configured") ? 503 : 502 }
    );
  }

  return NextResponse.json({ sent: true });
}
