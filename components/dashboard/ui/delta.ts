export function percentDelta(current: number, previous: number): number | null {
  if (!Number.isFinite(current) || !Number.isFinite(previous)) return null;
  if (previous === 0) return current === 0 ? 0 : 100;
  return ((current - previous) / Math.abs(previous)) * 100;
}

/** Last 7 values, left-padded so sparklines always render 7 points. */
export function sparklinePoints(values: number[], count = 7): number[] {
  const slice = values.slice(-count);
  if (slice.length === 0) return [];
  if (slice.length >= count) return slice;
  return [...Array(count - slice.length).fill(slice[0]), ...slice];
}

/** Compare the latest window to the previous window (falls back to first vs last). */
export function periodDelta(values: number[], window = 7): number | null {
  if (values.length < 2) return null;
  const recent = values.slice(-window);
  const prior = values.slice(-window * 2, -window);
  if (prior.length === 0) return percentDelta(recent[recent.length - 1] ?? 0, recent[0] ?? 0);
  const recentSum = recent.reduce((a, b) => a + b, 0);
  const priorSum = prior.reduce((a, b) => a + b, 0);
  return percentDelta(recentSum, priorSum);
}
