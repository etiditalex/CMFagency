import type { SupabaseClient } from "@supabase/supabase-js";

export type VotingSettings = {
  voting_starts_at: string | null;
  /** When false, public pages/APIs must not expose per-contestant tallies or vote-based ranking. */
  show_vote_totals: boolean;
};

/** Tallies stay public unless an admin explicitly hides them (and before patch 84 is applied). */
export const DEFAULT_SHOW_VOTE_TOTALS = true;

export const VOTING_SHOW_TOTALS_PATCH_FILE =
  "database/ticketing_voting_mvp_patch_84_fusion_voting_show_vote_totals.sql";

function isMissingShowVoteTotalsColumn(err: { message?: string; code?: string } | null): boolean {
  if (!err) return false;
  if (String(err.code ?? "") === "42703") return true;
  return String(err.message ?? "").toLowerCase().includes("show_vote_totals");
}

/**
 * Reads the singleton voting settings row, tolerating databases where patch 84
 * has not been applied yet (the column is then treated as enabled).
 */
export async function readVotingSettings(client: SupabaseClient): Promise<VotingSettings> {
  const withFlag = await client
    .from("fusion_voting_schedule")
    .select("voting_starts_at, show_vote_totals")
    .eq("id", 1)
    .maybeSingle();

  if (!withFlag.error) {
    const row = withFlag.data as { voting_starts_at?: string | null; show_vote_totals?: boolean | null } | null;
    return {
      voting_starts_at: row?.voting_starts_at ?? null,
      show_vote_totals: row?.show_vote_totals ?? DEFAULT_SHOW_VOTE_TOTALS,
    };
  }

  if (!isMissingShowVoteTotalsColumn(withFlag.error)) {
    return { voting_starts_at: null, show_vote_totals: DEFAULT_SHOW_VOTE_TOTALS };
  }

  const legacy = await client
    .from("fusion_voting_schedule")
    .select("voting_starts_at")
    .eq("id", 1)
    .maybeSingle();

  const row = legacy.error ? null : (legacy.data as { voting_starts_at?: string | null } | null);
  return {
    voting_starts_at: row?.voting_starts_at ?? null,
    show_vote_totals: DEFAULT_SHOW_VOTE_TOTALS,
  };
}