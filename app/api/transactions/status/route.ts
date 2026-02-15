import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Provider-agnostic transaction status lookup by internal reference.
 *
 * Env required:
 * - NEXT_PUBLIC_SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY (server-side only)
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const ref = (url.searchParams.get("ref") ?? "").trim();

  if (!ref) return NextResponse.json({ error: "Missing ref" }, { status: 400 });
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
    .select(
      "reference,provider,status,verified_at,fulfilled_at,paid_at,currency,amount,quantity,campaign_type,campaign_id,metadata,email,payer_name"
    )
    .eq("reference", ref)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!tx) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Fetch campaign for receipt display (title, dates)
  const campaignId = (tx as { campaign_id?: string }).campaign_id;
  let campaign_title: string | null = null;
  let campaign_slug: string | null = null;
  let starts_at: string | null = null;
  let ends_at: string | null = null;

  if (campaignId) {
    const { data: camp } = await supabase
      .from("campaigns")
      .select("title,slug,starts_at,ends_at")
      .eq("id", campaignId)
      .maybeSingle();
    if (camp) {
      campaign_title = (camp as { title?: string }).title ?? null;
      campaign_slug = (camp as { slug?: string }).slug ?? null;
      starts_at = (camp as { starts_at?: string | null }).starts_at ?? null;
      ends_at = (camp as { ends_at?: string | null }).ends_at ?? null;
    }
  }

  const meta =
    tx && typeof (tx as unknown as { metadata?: unknown }).metadata === "object" && (tx as unknown as { metadata?: unknown }).metadata
      ? ((tx as unknown as { metadata?: unknown }).metadata as Record<string, unknown>)
      : {};

  const res = NextResponse.json(
    {
      reference: tx.reference,
      provider: tx.provider,
      status: tx.status,
      verified_at: tx.verified_at,
      fulfilled_at: tx.fulfilled_at,
      paid_at: tx.paid_at,
      currency: tx.currency,
      amount: tx.amount,
      quantity: tx.quantity,
      campaign_type: tx.campaign_type,
      campaign_id: tx.campaign_id,
      email: (tx as { email?: string | null }).email ?? null,
      payer_name: (tx as { payer_name?: string | null }).payer_name ?? null,
      campaign_title,
      campaign_slug,
      starts_at,
      ends_at,
      mpesa_receipt: (meta["mpesa_receipt"] as string | null) ?? null,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
  return res;
}

