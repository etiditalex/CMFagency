import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function isCampaignInPublicWindow(c: { starts_at?: string | null; ends_at?: string | null }) {
  const t = Date.now();
  if (c.starts_at) {
    const s = Date.parse(String(c.starts_at));
    if (!Number.isNaN(s) && t < s) return false;
  }
  if (c.ends_at) {
    const e = Date.parse(String(c.ends_at));
    if (!Number.isNaN(e) && t > e) return false;
  }
  return true;
}

/**
 * One round-trip for public campaign pages: campaign + (for votes) contestants, tallies, voting schedule.
 * Mirrors RLS visibility: active, in starts_at/ends_at window.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug: rawSlug } = await params;
  const slug = rawSlug?.trim();
  if (!slug) return NextResponse.json({ error: "Missing slug" }, { status: 400 });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json({ error: "Server configuration missing" }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } });

  const { data: c, error: cErr } = await supabase
    .from("campaigns")
    .select("id,type,slug,title,description,image_url,currency,unit_amount,max_per_txn,is_active,starts_at,ends_at")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (cErr) {
    return NextResponse.json({ error: cErr.message }, { status: 500 });
  }

  const cacheHdr = { "Cache-Control": "public, s-maxage=15, stale-while-revalidate=60" };

  if (!c || !isCampaignInPublicWindow(c as { starts_at?: string | null; ends_at?: string | null })) {
    return NextResponse.json(
      {
        voting_starts_at: null as string | null,
        campaign: null,
        contestants: [] as unknown[],
        vote_counts: {} as Record<string, number>,
        not_found: true,
      },
      { headers: cacheHdr }
    );
  }

  const row = c as {
    id: string;
    type: string;
    slug: string;
    title: string;
    description: string | null;
    image_url: string | null;
    currency: string;
    unit_amount: number;
    max_per_txn: number;
  };

  const campaign = {
    id: row.id,
    type: row.type,
    slug: row.slug,
    title: row.title,
    description: row.description,
    image_url: row.image_url,
    currency: row.currency,
    unit_amount: row.unit_amount,
    max_per_txn: row.max_per_txn,
  };

  const readSchedule = () =>
    supabase.from("fusion_voting_schedule").select("voting_starts_at").eq("id", 1).maybeSingle();

  if (row.type !== "vote") {
    const { data: sched, error: sErr } = await readSchedule();
    const voting_starts_at =
      !sErr && sched ? (sched as { voting_starts_at?: string | null }).voting_starts_at ?? null : null;
    return NextResponse.json(
      {
        voting_starts_at,
        campaign,
        contestants: [],
        vote_counts: {},
      },
      { headers: cacheHdr }
    );
  }

  const [schedResult, conResult, txVoteResult] = await Promise.all([
    readSchedule(),
    supabase
      .from("contestants")
      .select("id,name,description,image_url,sort_order,created_at")
      .eq("campaign_id", row.id)
      .order("sort_order", { ascending: true }),
    supabase
      .from("transactions")
      .select("contestant_id,quantity")
      .eq("campaign_id", row.id)
      .eq("campaign_type", "vote")
      .eq("status", "success")
      .not("contestant_id", "is", null),
  ]);

  const voting_starts_at =
    !schedResult.error && schedResult.data
      ? (schedResult.data as { voting_starts_at?: string | null }).voting_starts_at ?? null
      : null;

  if (conResult.error) {
    return NextResponse.json({ error: conResult.error.message }, { status: 500 });
  }
  if (txVoteResult.error) {
    return NextResponse.json({ error: txVoteResult.error.message }, { status: 500 });
  }

  const vote_counts: Record<string, number> = {};
  for (const vr of (txVoteResult.data ?? []) as { contestant_id: string; quantity: number }[]) {
    const id = String(vr.contestant_id ?? "");
    const v = Number(vr.quantity ?? 0) || 0;
    if (!id) continue;
    vote_counts[id] = (vote_counts[id] ?? 0) + v;
  }

  return NextResponse.json(
    {
      voting_starts_at,
      campaign,
      contestants: conResult.data ?? [],
      vote_counts,
    },
    { headers: cacheHdr }
  );
}
