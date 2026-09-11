import { eatDayBoundsUtc, eatDayKey } from "@/lib/time/eat";

export type EventScheduleFields = {
  event_date: string;
  end_date?: string | null;
  time?: string | null;
};

const YMD_RE = /^(\d{4})-(\d{2})-(\d{2})/;
const CLOCK_RE = /\b(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)?\b/gi;

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function ymd(value: string | null | undefined): string {
  const match = String(value ?? "").trim().match(YMD_RE);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : "";
}

/** Last calendar day the event occupies (end_date when it is on/after the start). */
export function eventLastDay(event: EventScheduleFields): string {
  const start = ymd(event.event_date);
  const end = ymd(event.end_date);
  if (end && start && end >= start) return end;
  return start;
}

function parseClockTimes(time: string): { hour: number; minute: number }[] {
  const out: { hour: number; minute: number }[] = [];
  const re = new RegExp(CLOCK_RE.source, "gi");
  let match: RegExpExecArray | null;
  while ((match = re.exec(time)) !== null) {
    let hour = Number(match[1]);
    const minute = match[2] != null ? Number(match[2]) : 0;
    const ampm = match[3]?.toLowerCase().replace(/\./g, "") ?? "";
    if (!Number.isFinite(hour) || !Number.isFinite(minute) || hour > 23 || minute > 59) continue;
    if (ampm === "am" || ampm === "pm") {
      hour %= 12;
      if (ampm === "pm") hour += 12;
    } else if (match[2] == null) {
      continue;
    }
    out.push({ hour, minute });
  }
  return out;
}

function eatDateTime(day: string, hour: number, minute: number): Date {
  return new Date(`${day}T${pad2(hour)}:${pad2(minute)}:00+03:00`);
}

/**
 * Instant the event is over in East Africa Time.
 * Range times use the later clock; a single clock is when the event happens;
 * otherwise the last calendar day ends at 23:59:59.999 EAT.
 */
export function eventEndsAt(event: EventScheduleFields): Date | null {
  const day = eventLastDay(event);
  if (!day) return null;
  const clocks = parseClockTimes(String(event.time ?? ""));
  if (clocks.length > 0) {
    const clock = clocks[clocks.length - 1];
    const at = eatDateTime(day, clock.hour, clock.minute);
    return Number.isNaN(at.getTime()) ? null : at;
  }
  const bounds = eatDayBoundsUtc(day);
  if (!bounds) return null;
  const at = new Date(bounds.endIso);
  return Number.isNaN(at.getTime()) ? null : at;
}

export function isEventUpcoming(event: EventScheduleFields, now: Date = new Date()): boolean {
  const ends = eventEndsAt(event);
  if (!ends) return false;
  return now.getTime() < ends.getTime();
}

export function isEventPast(event: EventScheduleFields, now: Date = new Date()): boolean {
  return !isEventUpcoming(event, now);
}

export function eventPublicPath(
  event: EventScheduleFields & { slug: string },
  now: Date = new Date()
): string {
  const slug = event.slug.trim();
  return isEventUpcoming(event, now) ? `/events/upcoming/${slug}` : `/events/past/${slug}`;
}

/** EAT calendar day used to bound upcoming/past list queries. */
export function eventListDayKey(now: Date = new Date()): string {
  return eatDayKey(now);
}
