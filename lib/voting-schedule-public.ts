/** Used if schedule is missing from API (migration not applied yet). */
export const FALLBACK_VOTING_START_MS = new Date("2026-04-01T00:00:00+03:00").getTime();
/** Value the closing countdown used before it became admin-configurable (patch 85). */
export const FALLBACK_VOTING_END_MS = new Date("2026-08-10T23:59:59+03:00").getTime();

export function votingStartMsFromSchedule(iso: string | null): number {
  if (!iso) return FALLBACK_VOTING_START_MS;
  const t = Date.parse(iso);
  return Number.isNaN(t) ? FALLBACK_VOTING_START_MS : t;
}

export function votingEndMsFromSchedule(iso: string | null | undefined): number {
  if (!iso) return FALLBACK_VOTING_END_MS;
  const t = Date.parse(iso);
  return Number.isNaN(t) ? FALLBACK_VOTING_END_MS : t;
}

export const VOTING_CLOSED_MESSAGE = "Voting has closed. No further votes can be recorded.";

export function formatVotingDateInNairobi(isoMs: number): string {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: "Africa/Nairobi",
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date(isoMs));
  } catch {
    return "soon";
  }
}
