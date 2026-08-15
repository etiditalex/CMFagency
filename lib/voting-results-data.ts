import type { SupabaseClient } from "@supabase/supabase-js";

import { getVoteTransactionTotalsForCampaignsFlat } from "@/lib/vote-transaction-totals";

const CAMPAIGN_ID_CHUNK = 40;

export const VOTING_RESULTS_ADMIN_EMAIL = "auriljoy916@gmail.com";
export const VOTING_RESULTS_PATCH_FILE = "database/ticketing_voting_mvp_patch_90_fusion_voting_results_email.sql";

export type VotingResultsContestant = {
  id: string;
  name: string;
  email?: string | null;
  image_url: string | null;
  votes: number;
  rank: number;
};

export type VotingResultsCategory = {
  id: string;
  slug: string;
  title: string;
  contestants: VotingResultsContestant[];
  winners: VotingResultsContestant[];
  totalVotes: number;
};

export type VotingResultsSnapshot = {
  generatedAtIso: string;
  categories: VotingResultsCategory[];
  contestantCount: number;
  categoryCount: number;
  totalVotes: number;
};

function isMissingContestantEmailColumn(err: { message?: string; code?: string } | null): boolean {
  if (!err) return false;
  const msg = String(err.message ?? "").toLowerCase();
  return msg.includes("contestants.email") || (msg.includes("email") && (msg.includes("does not exist") || msg.includes("column")));
}

function rankByVotes(list: VotingResultsContestant[]): VotingResultsContestant[] {
  let previousVotes: number | null = null;
  let rank = 0;
  let seen = 0;
  return list.map((c) => {
    seen += 1;
    if (previousVotes === null || c.votes !== previousVotes) {
      rank = seen;
      previousVotes = c.votes;
    }
    return { ...c, rank };
  });
}

/**
 * Official close-of-voting snapshot: every active vote category, ranked by paid vote totals.
 * Winners are first place with at least one vote (ties are kept as joint winners).
 */
export async function loadVotingResultsSnapshot(client: SupabaseClient): Promise<VotingResultsSnapshot> {
  const { data: campaigns, error: cErr } = await client
    .from("campaigns")
    .select("id, slug, title, is_active")
    .eq("type", "vote")
    .eq("is_active", true)
    .order("title", { ascending: true });

  if (cErr) throw new Error(cErr.message ?? "Failed to load voting categories");

  const visible = campaigns ?? [];
  const ids = visible.map((c) => String(c.id));

  type ContestantRow = {
    id: string;
    campaign_id: string;
    name: string;
    email?: string | null;
    image_url: string | null;
    sort_order: number;
  };
  const allContestants: ContestantRow[] = [];

  if (ids.length > 0) {
    const chunks = Array.from({ length: Math.ceil(ids.length / CAMPAIGN_ID_CHUNK) }, (_, k) =>
      ids.slice(k * CAMPAIGN_ID_CHUNK, k * CAMPAIGN_ID_CHUNK + CAMPAIGN_ID_CHUNK)
    );
    const SELECT_WITH_EMAIL = "id, campaign_id, name, email, image_url, sort_order";
    const SELECT_MIN = "id, campaign_id, name, image_url, sort_order";
    const [firstContestantResults, voteTotals] = await Promise.all([
      Promise.all(chunks.map((chunk) => client.from("contestants").select(SELECT_WITH_EMAIL).in("campaign_id", chunk))),
      getVoteTransactionTotalsForCampaignsFlat(client, ids),
    ]);

    const emailMissing = firstContestantResults.some((r) => isMissingContestantEmailColumn(r.error));
    const contestantResults = emailMissing
      ? await Promise.all(chunks.map((chunk) => client.from("contestants").select(SELECT_MIN).in("campaign_id", chunk)))
      : firstContestantResults;

    for (const { data: rows, error: conErr } of contestantResults) {
      if (conErr) throw new Error(conErr.message ?? "Failed to load contestants");
      for (const r of rows ?? []) allContestants.push(r as ContestantRow);
    }

    const byCampaign = new Map<string, ContestantRow[]>();
    for (const row of allContestants) {
      const arr = byCampaign.get(row.campaign_id) ?? [];
      arr.push(row);
      byCampaign.set(row.campaign_id, arr);
    }

    const categories: VotingResultsCategory[] = visible.map((raw) => {
      const sorted = [...(byCampaign.get(String(raw.id)) ?? [])].sort((a, b) => {
        const va = voteTotals.get(a.id) ?? 0;
        const vb = voteTotals.get(b.id) ?? 0;
        if (vb !== va) return vb - va;
        if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
        return a.name.localeCompare(b.name);
      });
      const ranked = rankByVotes(
        sorted.map((r) => ({
          id: r.id,
          name: r.name,
          email: r.email ?? null,
          image_url: r.image_url,
          votes: voteTotals.get(r.id) ?? 0,
          rank: 0,
        }))
      );
      const topVotes = ranked[0]?.votes ?? 0;
      const winners = topVotes > 0 ? ranked.filter((c) => c.rank === 1) : [];
      return {
        id: String(raw.id),
        slug: String(raw.slug),
        title: String(raw.title),
        contestants: ranked,
        winners,
        totalVotes: ranked.reduce((n, c) => n + c.votes, 0),
      };
    });

    return {
      generatedAtIso: new Date().toISOString(),
      categories,
      contestantCount: allContestants.length,
      categoryCount: categories.length,
      totalVotes: categories.reduce((n, c) => n + c.totalVotes, 0),
    };
  }

  return {
    generatedAtIso: new Date().toISOString(),
    categories: [],
    contestantCount: 0,
    categoryCount: 0,
    totalVotes: 0,
  };
}

export function votingResultsResultLabel(
  contestant: Pick<VotingResultsContestant, "rank" | "votes">,
  winnerCount: number
): string {
  if (contestant.votes <= 0 || contestant.rank !== 1) return "";
  return winnerCount > 1 ? "Joint winner" : "Winner";
}

export function votingResultsFileStamp(iso: string): string {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Africa/Nairobi",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date(iso));
    const y = parts.find((p) => p.type === "year")?.value ?? "2026";
    const m = parts.find((p) => p.type === "month")?.value ?? "08";
    const d = parts.find((p) => p.type === "day")?.value ?? "15";
    return `${y}-${m}-${d}`;
  } catch {
    return "results";
  }
}

export function toVotingResultsPreview(snapshot: VotingResultsSnapshot) {
  return {
    generatedAtIso: snapshot.generatedAtIso,
    categoryCount: snapshot.categoryCount,
    contestantCount: snapshot.contestantCount,
    totalVotes: snapshot.totalVotes,
    categories: snapshot.categories.map((cat) => ({
      id: cat.id,
      slug: cat.slug,
      title: cat.title,
      totalVotes: cat.totalVotes,
      winners: cat.winners.map((w) => ({ id: w.id, name: w.name, votes: w.votes, rank: w.rank })),
      contestants: cat.contestants.map((c) => ({
        id: c.id,
        name: c.name,
        email: c.email ?? null,
        votes: c.votes,
        rank: c.rank,
        result: votingResultsResultLabel(c, cat.winners.length),
      })),
    })),
  };
}

export function votingResultsAdminEmail(): string {
  const fromEnv = process.env.VOTING_RESULTS_ADMIN_EMAIL?.trim();
  if (fromEnv && fromEnv.includes("@")) return fromEnv.toLowerCase();
  return VOTING_RESULTS_ADMIN_EMAIL;
}
