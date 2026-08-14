import { unstable_noStore as noStore } from "next/cache";
import { createClient } from "@supabase/supabase-js";

import { normalizeKenyaCurrencyForPayments } from "@/lib/lipa-pole-pole";
import { getVoteTransactionTotalsByCampaign } from "@/lib/vote-transaction-totals";
import { readVotingSettings } from "@/lib/voting-visibility";

export type CampaignPageCampaign = {
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

export type CampaignPageContestant = {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  sort_order: number;
  created_at: string | null;
};

export type CampaignPageData = {
  voting_starts_at: string | null;
  voting_ends_at: string | null;
  show_vote_totals: boolean;
  campaign: CampaignPageCampaign | null;
  contestants: CampaignPageContestant[];
  vote_counts: Record<string, number>;
  not_found?: boolean;
};

export type CampaignPageDataResult =
  | { ok: true; data: CampaignPageData; live: boolean }
  | { ok: false; status: number; error: string };

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
 *
 * `live` is false only for ticket campaigns, whose payload is safe to edge-cache briefly;
 * vote tallies must stay uncached so they never disagree with `/vote-counts`.
 */
export async function getCampaignPageData(rawSlug: string): Promise<CampaignPageDataResult> {
  const slug = rawSlug?.trim();
  if (!slug) return { ok: false, status: 400, error: "Missing slug" };

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) {
    return { ok: false, status: 500, error: "Server configuration missing" };
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

  const { voting_starts_at, voting_ends_at, show_vote_totals } = votingSettings;

  if (cErr) {
    return { ok: false, status: 500, error: cErr.message };
  }

  if (!c || !isCampaignInPublicWindow(c as { starts_at?: string | null; ends_at?: string | null })) {
    return {
      ok: true,
      live: true,
      data: {
        voting_starts_at,
        voting_ends_at,
        show_vote_totals,
        campaign: null,
        contestants: [],
        vote_counts: {},
        not_found: true,
      },
    };
  }

  const row = c as CampaignPageCampaign;

  const campaign: CampaignPageCampaign = {
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
    return {
      ok: true,
      live: false,
      data: {
        voting_starts_at,
        voting_ends_at,
        show_vote_totals,
        campaign,
        contestants: [],
        vote_counts: {},
      },
    };
  }

  noStore();

  let contestantsResult: { data: unknown; error: { message?: string } | null };
  let vote_counts: Record<string, number>;

  try {
    /** Contestants and tallies are independent; running them together halves vote-page latency. */
    [contestantsResult, vote_counts] = await Promise.all([
      supabase
        .from("contestants")
        .select("id,name,description,image_url,sort_order,created_at")
        .eq("campaign_id", row.id)
        .order("sort_order", { ascending: true }),
      show_vote_totals
        ? getVoteTransactionTotalsByCampaign(supabase, row.id)
        : Promise.resolve({} as Record<string, number>),
    ]);
  } catch (e: unknown) {
    const msg =
      e && typeof e === "object" && "message" in e
        ? String((e as { message: string }).message)
        : "Failed to load vote totals";
    return { ok: false, status: 500, error: msg };
  }

  if (contestantsResult.error) {
    return { ok: false, status: 500, error: contestantsResult.error.message ?? "Failed to load contestants" };
  }

  return {
    ok: true,
    live: true,
    data: {
      voting_starts_at,
      voting_ends_at,
      show_vote_totals,
      campaign,
      contestants: (contestantsResult.data ?? []) as CampaignPageContestant[],
      vote_counts,
    },
  };
}
