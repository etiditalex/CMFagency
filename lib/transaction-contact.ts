/** Payer / referral contact fields stored on `transactions.metadata`. */
export type TransactionContactFields = {
  payer_phone: string | null;
  referred_by: string | null;
  referrer_phone: string | null;
};

export function contactFromTransactionMetadata(meta: unknown): TransactionContactFields {
  const m =
    meta && typeof meta === "object" && !Array.isArray(meta) ? (meta as Record<string, unknown>) : {};
  const payerPhone = String(m.payer_phone ?? m.phone ?? "").trim();
  const referredBy = String(m.referred_by ?? "").trim();
  const referrerPhone = String(m.referrer_phone ?? "").trim();
  return {
    payer_phone: payerPhone || null,
    referred_by: referredBy || null,
    referrer_phone: referrerPhone || null,
  };
}
