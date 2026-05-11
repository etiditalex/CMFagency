/** Skip very new STK / checkout rows so we do not hammer verify during active payment. */
const PENDING_MIN_AGE_MS = 45_000;

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
    return now - created >= PENDING_MIN_AGE_MS;
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
