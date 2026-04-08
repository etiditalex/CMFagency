/** Used if schedule is missing from API (migration not applied yet). */
export const FALLBACK_VOTING_START_MS = new Date("2026-04-01T00:00:00+03:00").getTime();

export function votingStartMsFromSchedule(iso: string | null): number {
  if (!iso) return FALLBACK_VOTING_START_MS;
  const t = Date.parse(iso);
  return Number.isNaN(t) ? FALLBACK_VOTING_START_MS : t;
}

export function formatVotingOpensInNairobi(isoMs: number): string {
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
