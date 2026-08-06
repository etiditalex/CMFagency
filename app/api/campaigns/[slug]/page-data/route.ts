import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { getVoteTransactionTotalsByCampaign } from "@/lib/vote-transaction-totals";
import { normalizeKenyaCurrencyForPayments } from "@/lib/lipa-pole-pole";
import { readVotingSettings } from "@/lib/voting-visibility";

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

  const [{ data: c, error: cErr }, votingSettings] = await Promise.all([
    supabase
      .from("campaigns")
      .select("id,type,slug,title,description,image_url,currency,unit_amount,max_per_txn,is_active,starts_at,ends_at")
      .eq("slug", slug)
      .eq("is_active", true)
      .maybeSingle(),
    readVotingSettings(supabase),
  ]);

  const voting_starts_at = votingSettings.voting_starts_at;
  const show_vote_totals = votingSettings.show_vote_totals;

  if (cErr) {
    return NextResponse.json({ error: cErr.message }, { status: 500 });
  }

  /** Vote totals must not be edge-cached; stale tallies vs `/vote-counts` (no-store) looked like fluctuating votes/revenue. */
  const cacheHdrLive = { "Cache-Control": "no-store, max-age=0" };
  const cacheHdrStatic = { "Cache-Control": "public, s-maxage=15, stale-while-revalidate=60" };

  if (!c || !isCampaignInPublicWindow(c as { starts_at?: string | null; ends_at?: string | null })) {
    return NextResponse.json(
      {
        voting_starts_at,
        show_vote_totals,
        campaign: null,
        contestants: [] as unknown[],
        vote_counts: {} as Record<string, number>,
        not_found: true,
      },
      { headers: cacheHdrLive }
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
    currency: normalizeKenyaCurrencyForPayments(row.currency),
    unit_amount: row.unit_amount,
    max_per_txn: row.max_per_txn,
  };

  if (row.type !== "vote") {
    return NextResponse.json(
      {
        voting_starts_at,
        show_vote_totals,
        campaign,
        contestants: [],
        vote_counts: {},
      },
      { headers: cacheHdrStatic }
    );
  }

  let conResult: { data: unknown; error: { message?: string } | null };
  let vote_counts: Record<string, number>;

  try {
    conResult = await supabase
      .from("contestants")
      .select("id,name,description,image_url,sort_order,created_at")
      .eq("campaign_id", row.id)
      .order("sort_order", { ascending: true });

    vote_counts = show_vote_totals ? await getVoteTransactionTotalsByCampaign(supabase, row.id) : {};
  } catch (e: unknown) {
    const msg =
      e && typeof e === "object" && "message" in e ? String((e as { message: string }).message) : "Failed to load vote totals";
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  if (conResult.error) {
    return NextResponse.json({ error: conResult.error.message }, { status: 500 });
  }

  return NextResponse.json(
    {
      voting_starts_at,
      show_vote_totals,
      campaign,
      contestants: conResult.data ?? [],
      vote_counts,
    },
    { headers: cacheHdrLive }
  );
}
