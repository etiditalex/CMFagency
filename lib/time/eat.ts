/** East Africa Time — used for Fusion Xpress attendance, reporting, and summaries. */
export const EAT_TIMEZONE = "Africa/Nairobi";

const YMD_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

function eatPartsFromDate(date: Date): { year: number; month: number; day: number } {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: EAT_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(date);
  const year = Number(parts.find((p) => p.type === "year")?.value ?? 0);
  const month = Number(parts.find((p) => p.type === "month")?.value ?? 0);
  const day = Number(parts.find((p) => p.type === "day")?.value ?? 0);
  return { year, month, day };
}

/** Calendar day key (yyyy-MM-dd) in EAT. */
export function eatDayKey(isoOrDate: string | Date): string {
  const d = typeof isoOrDate === "string" ? new Date(isoOrDate) : isoOrDate;
  if (Number.isNaN(d.getTime())) return "";
  const { year, month, day } = eatPartsFromDate(d);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function eatTodayDayKey(): string {
  return eatDayKey(new Date());
}

/** UTC instants for the inclusive start/end of one EAT calendar day. */
export function eatDayBoundsUtc(ymd: string): { startIso: string; endIso: string } | null {
  if (!YMD_RE.test(ymd)) return null;
  return {
    startIso: new Date(`${ymd}T00:00:00+03:00`).toISOString(),
    endIso: new Date(`${ymd}T23:59:59.999+03:00`).toISOString(),
  };
}

export function eatTodayBounds(): { startIso: string; endIso: string; dayKey: string } {
  const dayKey = eatTodayDayKey();
  const bounds = eatDayBoundsUtc(dayKey);
  if (!bounds) {
    const now = new Date();
    return { startIso: now.toISOString(), endIso: now.toISOString(), dayKey };
  }
  return { ...bounds, dayKey };
}

/** Inclusive date range [from, to] as yyyy-MM-dd in EAT. */
export function eatRangeBoundsUtc(
  fromYmd: string,
  toYmd: string
): { fromDate: Date; toDate: Date } | null {
  const start = eatDayBoundsUtc(fromYmd);
  const end = eatDayBoundsUtc(toYmd);
  if (!start || !end) return null;
  return { fromDate: new Date(start.startIso), toDate: new Date(end.endIso) };
}

export function eachEatDayKeys(fromYmd: string, toYmd: string): string[] {
  if (!YMD_RE.test(fromYmd) || !YMD_RE.test(toYmd) || fromYmd > toYmd) return [];
  const keys: string[] = [];
  let cur = fromYmd;
  for (let guard = 0; guard < 400; guard += 1) {
    keys.push(cur);
    if (cur === toYmd) break;
    const next = new Date(`${cur}T12:00:00+03:00`);
    next.setTime(next.getTime() + 86_400_000);
    cur = eatDayKey(next);
  }
  return keys;
}

export function eatDaySpanInclusive(fromYmd: string, toYmd: string): number {
  return eachEatDayKeys(fromYmd, toYmd).length;
}

/** Minutes since midnight in EAT (for reporting windows and averages). */
export function eatMinutesFromIso(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: EAT_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(d);
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return hour * 60 + minute;
}

/** Hour of day 0–23 in EAT. */
export function eatHourFromIso(iso: string): number {
  const mins = eatMinutesFromIso(iso);
  if (mins === null) return 0;
  return Math.floor(mins / 60) % 24;
}

/** Short clock label for charts (e.g. "8:00 AM EAT"). */
export function formatEatHourLabel(hour24: number): string {
  const h = hour24 % 24;
  const hour12 = h % 12 || 12;
  const ampm = h < 12 ? "AM" : "PM";
  return `${hour12}:00 ${ampm} EAT`;
}

/** Value for `<input type="datetime-local" />` interpreted in EAT. */
export function eatDatetimeLocalValue(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: EAT_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const pick = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "00";
  return `${pick("year")}-${pick("month")}-${pick("day")}T${pick("hour")}:${pick("minute")}`;
}
