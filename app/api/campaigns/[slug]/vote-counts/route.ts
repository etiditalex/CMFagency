import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Public vote counts per contestant for an active vote campaign.
 * Used so voters can see live totals and competition.
 * Uses service role to bypass RLS (votes are normally admin-only).
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

  // Aggregate votes per contestant
  const { data: voteRows, error: voteErr } = await supabase
    .from("votes")
    .select("contestant_id,votes")
    .eq("campaign_id", campaignId);

  if (voteErr) return NextResponse.json({ error: voteErr.message }, { status: 500 });

  const byContestant: Record<string, number> = {};
  for (const row of (voteRows ?? []) as { contestant_id: string; votes: number }[]) {
    const id = String(row.contestant_id ?? "");
    const v = Number(row.votes ?? 0) || 0;
    if (!id) continue;
    byContestant[id] = (byContestant[id] ?? 0) + v;
  }

  return NextResponse.json(
    { counts: byContestant },
    { headers: { "Cache-Control": "no-store, max-age=0" } }
  );
}
