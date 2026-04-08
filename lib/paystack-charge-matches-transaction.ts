/**
 * Validates Paystack charge.amount (subunits) and currency against our transactions row.
 * Prefer metadata.paystack_amount_subunit when set (exact value sent to Paystack at init).
 */
export function paystackChargeMatchesTransaction(
  paidSubunit: number,
  paidCurrencyRaw: string,
  tx: { amount: number | string | null; currency: string | null; metadata?: unknown }
): { ok: true } | { ok: false; code: "amount" | "currency" } {
  const meta =
    typeof tx.metadata === "object" && tx.metadata !== null && !Array.isArray(tx.metadata)
      ? (tx.metadata as Record<string, unknown>)
      : {};
  const storedSubunit = meta.paystack_amount_subunit;
  const expectedSubunit =
    typeof storedSubunit === "number" && Number.isFinite(storedSubunit)
      ? Math.trunc(storedSubunit)
      : Math.round(Number(tx.amount ?? 0) * 100);

  const paid = Math.round(Number(paidSubunit));
  if (!Number.isFinite(paid) || paid !== expectedSubunit) {
    return { ok: false, code: "amount" };
  }

  const paidCur = (paidCurrencyRaw ?? "").trim().toUpperCase();
  const txCur = String(tx.currency ?? "")
    .trim()
    .toUpperCase();
  if (paidCur !== txCur) {
    return { ok: false, code: "currency" };
  }

  return { ok: true };
}
