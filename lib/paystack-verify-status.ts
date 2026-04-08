/**
 * Paystack /transaction/verify returns data.status values such as:
 * success, failed, abandoned, pending, ongoing, processing, queued, reversed.
 *
 * We only auto-close DB rows when Paystack reports a terminal outcome.
 * In-progress statuses stay pending in our DB until Paystack completes the charge.
 */

/** True when Paystack will not become success without a new charge (same reference usually stays terminal). */
export function paystackStatusIsTerminalNonSuccess(status: string): boolean {
  const s = String(status ?? "").toLowerCase();
  return s === "failed" || s === "abandoned" || s === "reversed";
}

/** DB status to set when Paystack reports a terminal non-success charge. */
export function dbStatusForPaystackTerminal(paystackStatus: string): "failed" | "abandoned" {
  const s = String(paystackStatus ?? "").toLowerCase();
  if (s === "abandoned") return "abandoned";
  return "failed";
}
