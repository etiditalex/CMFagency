/** Paystack: avoid verify spam while the hosted checkout is still open. */
const PAYSTACK_PENDING_MIN_AGE_MS = 25_000;

/**
 * M-Pesa STK usually resolves in seconds; reconciling after a short delay lets
 * verify-ref mark cancelled/timeout as failed without waiting almost a minute.
 */
const DARAJA_PENDING_MIN_AGE_MS = 4_000;

export type ReconcileTxRow = {
  reference: string;
  status?: string | null;
  provider?: string | null;
  created_at?: string | null;
};

/**
 * Best-effort: asks Paystack / Daraja verify endpoints to refresh stuck `pending` rows.
 * Used by dashboard lists after webhook lag.
 */
export async function reconcileStalePendingTransactions(rows: ReconcileTxRow[]): Promise<boolean> {
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
