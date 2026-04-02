import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Public vote totals per contestant for an active vote campaign.
 * Sums successful vote transaction quantities (same source as payment-backed votes).
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  if (!slug?.trim()) return NextResponse.json({ error: "Missing slug" }, { status: 400 });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json({ error: "Server config missing" }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });

  // Resolve campaign by slug (must be vote type and active)
  const { data: campaign, error: campErr } = await supabase
    .from("campaigns")
    .select("id,type")
    .eq("slug", slug)
    .eq("type", "vote")
    .eq("is_active", true)
    .maybeSingle();

  if (campErr) return NextResponse.json({ error: campErr.message }, { status: 500 });
  if (!campaign) return NextResponse.json({ error: "Campaign not found or not a vote campaign" }, { status: 404 });

  const campaignId = (campaign as { id: string }).id;

  // Quantities from successful vote payments (aligns with revenue; public.votes can lag if fulfillment failed).
  const { data: txRows, error: txErr } = await supabase
    .from("transactions")
    .select("contestant_id,quantity")
    .eq("campaign_id", campaignId)
    .eq("campaign_type", "vote")
    .eq("status", "success")
    .not("contestant_id", "is", null);

  if (txErr) return NextResponse.json({ error: txErr.message }, { status: 500 });

  const byContestant: Record<string, number> = {};
  for (const row of (txRows ?? []) as { contestant_id: string; quantity: number }[]) {
    const id = String(row.contestant_id ?? "");
    const v = Number(row.quantity ?? 0) || 0;
    if (!id) continue;
    byContestant[id] = (byContestant[id] ?? 0) + v;
  }

  return NextResponse.json(
    { counts: byContestant },
    { headers: { "Cache-Control": "no-store, max-age=0" } }
  );
}
