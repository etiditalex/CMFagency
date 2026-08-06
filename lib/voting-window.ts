import type { SupabaseClient } from "@supabase/supabase-js";

import {
  formatVotingDateInNairobi,
  votingEndMsFromSchedule,
  votingStartMsFromSchedule,
  VOTING_CLOSED_MESSAGE,
} from "./voting-schedule-public";
import { readVotingSettings } from "./voting-visibility";

/**
 * Server-side twin of the public page's voting window lock: a tab left open past
 * the closing instant (or opened before voting starts) must not be able to start
 * a vote payment. Returns a voter-facing message when the vote must be refused.
 */
export async function findVotingWindowRejection(client: SupabaseClient): Promise<string | null> {
  const settings = await readVotingSettings(client);
  const now = Date.now();

  if (now >= votingEndMsFromSchedule(settings.voting_ends_at)) return VOTING_CLOSED_MESSAGE;

  const startMs = votingStartMsFromSchedule(settings.voting_starts_at);
  if (now < startMs) {
    return `Voting opens ${formatVotingDateInNairobi(startMs)} (East Africa Time).`;
  }

  return null;
}
