import type { SupabaseClient } from "@supabase/supabase-js";

import { sendVotingResultsEmail } from "@/lib/send-voting-results-email";
import { loadVotingResultsSnapshot, votingResultsAdminEmail, VOTING_RESULTS_PATCH_FILE } from "@/lib/voting-results-data";
import { buildVotingResultsPdfs } from "@/lib/voting-results-pdf";
import { votingEndMsFromSchedule } from "@/lib/voting-schedule-public";
import { readVotingSettings } from "@/lib/voting-visibility";

export type VotingResultsCronResult = {
  skipped?: string;
  sent?: boolean;
  to?: string;
  winnersFilename?: string;
  contestantsFilename?: string;
  categoryCount?: number;
  contestantCount?: number;
  error?: string;
  patchHint?: string;
};

async function readResultsEmailedAt(admin: SupabaseClient): Promise<string | null | "missing-column"> {
  const { data, error } = await admin
    .from("fusion_voting_schedule")
    .select("results_emailed_at")
    .eq("id", 1)
    .maybeSingle();
  if (error) {
    const msg = String(error.message ?? "").toLowerCase();
    if (msg.includes("results_emailed_at") || String(error.code ?? "") === "42703") return "missing-column";
    throw new Error(error.message);
  }
  return (data as { results_emailed_at?: string | null } | null)?.results_emailed_at ?? null;
}

async function markResultsEmailed(admin: SupabaseClient): Promise<void> {
  const { error } = await admin
    .from("fusion_voting_schedule")
    .update({ results_emailed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", 1);
  if (error) {
    const msg = String(error.message ?? "").toLowerCase();
    if (msg.includes("results_emailed_at") || String(error.code ?? "") === "42703") {
      throw new Error(`Column results_emailed_at missing. Run ${VOTING_RESULTS_PATCH_FILE} in Supabase.`);
    }
    throw new Error(error.message);
  }
}

/**
 * After the global voting window closes, generate the gold winners PDF and the
 * all-contestants PDF, email them to the voting admin, and record that they were sent.
 */
export async function runVotingResultsCron(
  admin: SupabaseClient,
  options?: { force?: boolean }
): Promise<VotingResultsCronResult> {
  const force = options?.force === true;
  const settings = await readVotingSettings(admin);
  const endMs = votingEndMsFromSchedule(settings.voting_ends_at);
  if (!force && Date.now() < endMs) {
    return { skipped: "voting_still_open" };
  }

  const emailedAt = await readResultsEmailedAt(admin);
  if (emailedAt === "missing-column") {
    return {
      error: `Column results_emailed_at missing. Run ${VOTING_RESULTS_PATCH_FILE} in Supabase.`,
      patchHint: VOTING_RESULTS_PATCH_FILE,
    };
  }
  if (!force && emailedAt) {
    return { skipped: "already_sent", sent: false };
  }

  const snapshot = await loadVotingResultsSnapshot(admin);
  const pdfs = await buildVotingResultsPdfs(snapshot);
  const to = votingResultsAdminEmail();
  const sent = await sendVotingResultsEmail({
    to,
    snapshot,
    winnersPdf: pdfs.winners,
    contestantsPdf: pdfs.contestants,
  });
  if (!sent.ok) {
    return { error: sent.error ?? "Failed to send results email", to };
  }

  await markResultsEmailed(admin);
  return {
    sent: true,
    to,
    winnersFilename: pdfs.winners.filename,
    contestantsFilename: pdfs.contestants.filename,
    categoryCount: snapshot.categoryCount,
    contestantCount: snapshot.contestantCount,
  };
}
