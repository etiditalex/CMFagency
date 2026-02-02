import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Returns webhook-confirmed transaction status by Paystack reference.
 *
 * Env required:
 * - NEXT_PUBLIC_SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY (server-side only)
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const ref = (url.searchParams.get("ref") ?? "").trim();

  if (!ref) return NextResponse.json({ error: "Missing ref" }, { status: 400 });
  // Basic input hardening to avoid abuse and satisfy scanners.
  // Paystack refs are typically short, url-safe identifiers.
  if (!/^[A-Za-z0-9._-]{6,128}$/.test(ref)) {
    return NextResponse.json({ error: "Invalid ref" }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json({ error: "Supabase server env vars missing" }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });

  const { data: tx, error } = await supabase
    .from("transactions")
    .select("reference,status,verified_at,fulfilled_at,paid_at,currency,amount,quantity,campaign_type,campaign_id")
    .eq("reference", ref)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!tx) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Intentionally do NOT return buyer PII (email).
  const res = NextResponse.json(
    {
    reference: tx.reference,
    status: tx.status,
    verified_at: tx.verified_at,
    fulfilled_at: tx.fulfilled_at,
    paid_at: tx.paid_at,
    currency: tx.currency,
    amount: tx.amount,
    quantity: tx.quantity,
    campaign_type: tx.campaign_type,
    campaign_id: tx.campaign_id,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
  return res;
}

