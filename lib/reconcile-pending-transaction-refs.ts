/** Paystack: avoid verify spam while the hosted checkout is still open. */
const PAYSTACK_PENDING_MIN_AGE_MS = 25_000;

/**
 * M-Pesa STK usually resolves in seconds; wait before verify-ref so Safaricom
 * can return "still processing" (e.g. 4999) instead of a false failure.
 */
const DARAJA_PENDING_MIN_AGE_MS = 20_000;

const DEFAULT_MAX_RECONCILE = 3;

export type ReconcileTxRow = {
  reference: string;
  status?: string | null;
  provider?: string | null;
  created_at?: string | null;
};

export type ReconcileOptions = {
  /** Cap verify-ref calls per refresh so dashboard lists stay snappy. */
  maxRefs?: number;
};

function pickStalePending(rows: ReconcileTxRow[], maxRefs: number): ReconcileTxRow[] {
  const now = Date.now();
  const pending = rows.filter((t) => {
    if (String(t.status ?? "").toLowerCase() !== "pending") return false;
    const p = String(t.provider ?? "").toLowerCase();
    if (p !== "paystack" && p !== "daraja") return false;
    const created = t.created_at ? Date.parse(String(t.created_at)) : NaN;
    if (Number.isNaN(created)) return false;
    const minAge = p === "paystack" ? PAYSTACK_PENDING_MIN_AGE_MS : DARAJA_PENDING_MIN_AGE_MS;
    return now - created >= minAge;
  });
  return pending.slice(0, Math.max(0, maxRefs));
}

/**
 * Best-effort: asks Paystack / Daraja verify endpoints to refresh stuck `pending` rows.
 * Used by dashboard lists after webhook lag.
 */
export async function reconcileStalePendingTransactions(
  rows: ReconcileTxRow[],
  options?: ReconcileOptions
): Promise<boolean> {
  const pending = pickStalePending(rows, options?.maxRefs ?? DEFAULT_MAX_RECONCILE);
  if (pending.length === 0) return false;

  await Promise.all(
    pending.map((t) => {
      const p = String(t.provider ?? "").toLowerCase();
      const url = p === "paystack" ? "/api/paystack/verify-ref" : "/api/daraja/verify-ref";
      return fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ref: t.reference }),
      }).catch(() => {});
    })
  );
  return true;
}

/**
 * Fire-and-forget reconcile — does not block dashboard render.
 * Calls `onUpdated` when any pending row may have changed.
 */
export function reconcileStalePendingTransactionsInBackground(
  rows: ReconcileTxRow[],
  onUpdated?: () => void,
  options?: ReconcileOptions
): void {
  const pending = pickStalePending(rows, options?.maxRefs ?? DEFAULT_MAX_RECONCILE);
  if (pending.length === 0) return;

  void reconcileStalePendingTransactions(pending, { maxRefs: pending.length }).then((touched) => {
    if (touched) onUpdated?.();
  });
}
