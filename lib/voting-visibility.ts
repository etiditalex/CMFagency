import type { SupabaseClient } from "@supabase/supabase-js";

export type VotingSettings = {
  voting_starts_at: string | null;
  /** Last moment votes are counted down to (23:59:59 East Africa Time on the closing day). */
  voting_ends_at: string | null;
  /** When false, public pages/APIs must not expose per-contestant tallies or vote-based ranking. */
  show_vote_totals: boolean;
};

/** Tallies stay public unless an admin explicitly hides them (and before patch 84 is applied). */
export const DEFAULT_SHOW_VOTE_TOTALS = true;

export const VOTING_SHOW_TOTALS_PATCH_FILE =
  "database/ticketing_voting_mvp_patch_84_fusion_voting_show_vote_totals.sql";

export const VOTING_ENDS_AT_PATCH_FILE = "database/ticketing_voting_mvp_patch_85_fusion_voting_ends_at.sql";

/** Columns added after patch 62; databases missing a patch fall back to a narrower select. */
const OPTIONAL_COLUMNS = ["voting_ends_at", "show_vote_totals"];

const SELECT_FALLBACK_CHAIN = [
  "voting_starts_at, voting_ends_at, show_vote_totals",
  "voting_starts_at, show_vote_totals",
  "voting_starts_at",
];

type ScheduleRow = {
  voting_starts_at?: string | null;
  voting_ends_at?: string | null;
  show_vote_totals?: boolean | null;
};

function isMissingOptionalColumn(err: { message?: string; code?: string } | null): boolean {
  if (!err) return false;
  if (String(err.code ?? "") === "42703") return true;
  const msg = String(err.message ?? "").toLowerCase();
  return OPTIONAL_COLUMNS.some((c) => msg.includes(c));
}

/**
 * Reads the singleton voting settings row, tolerating databases where patch 84
 * or 85 has not been applied yet (missing columns fall back to defaults).
 */
export async function readVotingSettings(client: SupabaseClient): Promise<VotingSettings> {
  for (const columns of SELECT_FALLBACK_CHAIN) {
    const { data, error } = await client
      .from("fusion_voting_schedule")
      .select(columns)
      .eq("id", 1)
      .maybeSingle();

    if (!error) {
      const row = data as ScheduleRow | null;
      return {
        voting_starts_at: row?.voting_starts_at ?? null,
        voting_ends_at: row?.voting_ends_at ?? null,
        show_vote_totals: row?.show_vote_totals ?? DEFAULT_SHOW_VOTE_TOTALS,
      };
    }

    if (!isMissingOptionalColumn(error)) break;
  }

  return { voting_starts_at: null, voting_ends_at: null, show_vote_totals: DEFAULT_SHOW_VOTE_TOTALS };
}
