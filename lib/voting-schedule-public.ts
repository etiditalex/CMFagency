/** Used if schedule is missing from API (migration not applied yet). */
export const FALLBACK_VOTING_START_MS = new Date("2026-04-01T00:00:00+03:00").getTime();
/** Midnight at the end of 14 Aug 2026 (15 Aug 2026 00:00 East Africa Time). */
export const FALLBACK_VOTING_END_MS = new Date("2026-08-15T00:00:00+03:00").getTime();

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

/**
 * Calendar day shown in the admin date picker for a close instant.
 * Midnight 00:00 EAT is the start of the next calendar day, so the last voting day is the previous one.
 */
export function lastVotingDayYmdFromEndIso(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const clock = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Africa/Nairobi",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(d);
    const hour = clock.find((p) => p.type === "hour")?.value ?? "00";
    const minute = clock.find((p) => p.type === "minute")?.value ?? "00";
    const isMidnight = (hour === "00" || hour === "24") && (minute === "00" || minute === "0");
    const adjusted = isMidnight ? new Date(d.getTime() - 60_000) : d;
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Africa/Nairobi",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(adjusted);
    const y = parts.find((p) => p.type === "year")?.value;
    const m = parts.find((p) => p.type === "month")?.value;
    const day = parts.find((p) => p.type === "day")?.value;
    if (!y || !m || !day) return "";
    return `${y}-${m}-${day}`;
  } catch {
    return "";
  }
}
