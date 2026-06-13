import { eatDayBoundsUtc, eatRangeBoundsUtc } from "@/lib/time/eat";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function parseIntegrationDateRange(
  fromRaw: string | null | undefined,
  toRaw: string | null | undefined
):
  | { from: string; to: string; fromIso: string; toIso: string }
  | { error: string } {
  const from = String(fromRaw ?? "").trim();
  const to = String(toRaw ?? "").trim();
  if (!DATE_RE.test(from) || !DATE_RE.test(to)) {
    return { error: "Query params from and to are required (YYYY-MM-DD)." };
  }
  if (to < from) {
    return { error: "to must be on or after from." };
  }

  const bounds = eatRangeBoundsUtc(from, to);
  if (!bounds) {
    return { error: "Invalid date range." };
  }

  return {
    from,
    to,
    fromIso: bounds.fromDate.toISOString(),
    toIso: bounds.toDate.toISOString(),
  };
}

export function parseOptionalIntegrationDay(raw: string | null | undefined): string | null {
  const day = String(raw ?? "").trim();
  if (!day) return null;
  if (!DATE_RE.test(day)) return null;
  return eatDayBoundsUtc(day) ? day : null;
}

export function integrationLimit(raw: string | null | undefined, max = 2000): number {
  const n = parseInt(String(raw ?? "500"), 10);
  if (!Number.isFinite(n) || n < 1) return 500;
  return Math.min(max, n);
}
