import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { getVoteTransactionTotalsByCampaign } from "@/lib/vote-transaction-totals";

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

  let byContestant: Record<string, number>;
  try {
    byContestant = await getVoteTransactionTotalsByCampaign(supabase, campaignId);
  } catch (e: unknown) {
    const msg = e && typeof e === "object" && "message" in e ? String((e as { message: string }).message) : "query failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  return NextResponse.json(
    { counts: byContestant },
    { headers: { "Cache-Control": "no-store, max-age=0" } }
  );
}
