import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { getVoteTransactionTotalsByCampaign } from "@/lib/vote-transaction-totals";
import { readVotingSettings } from "@/lib/voting-visibility";

/**
 * Public vote totals per contestant for an active vote campaign.
 * Sums successful vote transaction quantities (same source as payment-backed votes).
 * Returns no tallies while the global `show_vote_totals` switch is off.
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
  const [{ data: campaign, error: campErr }, votingSettings] = await Promise.all([
    supabase
      .from("campaigns")
      .select("id,type")
      .eq("slug", slug)
      .eq("type", "vote")
      .eq("is_active", true)
      .maybeSingle(),
    readVotingSettings(supabase),
  ]);

  if (campErr) return NextResponse.json({ error: campErr.message }, { status: 500 });
  if (!campaign) return NextResponse.json({ error: "Campaign not found or not a vote campaign" }, { status: 404 });

  if (!votingSettings.show_vote_totals) {
    return NextResponse.json(
      { counts: {} as Record<string, number>, show_vote_totals: false },
      { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" } }
    );
  }

  const campaignId = (campaign as { id: string }).id;

  let byContestant: Record<string, number>;
  try {
    byContestant = await getVoteTransactionTotalsByCampaign(supabase, campaignId);
  } catch (e: unknown) {
    const msg = e && typeof e === "object" && "message" in e ? String((e as { message: string }).message) : "query failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  return NextResponse.json(
    { counts: byContestant, show_vote_totals: true },
    { headers: { "Cache-Control": "public, s-maxage=8, stale-while-revalidate=20" } }
  );
}
