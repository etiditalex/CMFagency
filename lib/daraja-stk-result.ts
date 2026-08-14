export type StkMetadataItem = { Name: string; Value: string | number };

/** STK Query result codes that mean Safaricom is still processing — not a failure. */
const STK_QUERY_PENDING_CODES = new Set([4999, 500001]);

export function getStkMetadataItem(items: StkMetadataItem[], name: string): string | number | undefined {
  return items.find((i) => String(i.Name) === name)?.Value;
}

export function hasMpesaReceipt(items: StkMetadataItem[]): boolean {
  const receipt = getStkMetadataItem(items, "MpesaReceiptNumber");
  return receipt !== undefined && receipt !== null && String(receipt).trim() !== "";
}

/** STK Push callback success — receipt present or ResultCode 0. */
export function isStkCallbackSuccess(resultCode: unknown, items: StkMetadataItem[]): boolean {
  if (hasMpesaReceipt(items)) return true;
  if (resultCode === undefined || resultCode === null) return false;
  const s = String(resultCode).trim();
  if (s === "0" || s === "00") return true;
  const n = Number(resultCode);
  return Number.isFinite(n) && n === 0;
}

/** STK Query still pending — do not mark the transaction failed. */
export function isStkQueryStillPending(
  resultCode: number,
  resultDesc: string,
  items: StkMetadataItem[] = []
): boolean {
  if (hasMpesaReceipt(items)) return false;
  if (STK_QUERY_PENDING_CODES.has(resultCode)) return true;
  const desc = resultDesc.toLowerCase();
  return desc.includes("still under processing") || desc.includes("being processed");
}

/**
 * STK Query / verify-ref may only auto-finalize **pending** STK Push rows.
 * Failed rows (timeout, cancelled, no PIN) are never auto-marked paid — the
 * customer may have paid separately via paybill, which only an admin can confirm.
 * A late Safaricom STK **callback** with a receipt can still succeed a failed row.
 */
export function canAutoReconcileDarajaStkQuery(status: string): boolean {
  return String(status ?? "").toLowerCase() === "pending";
}

/** Minimum age before client-side Daraja verify-ref runs (avoids false failures). */
export const DARAJA_CLIENT_VERIFY_MIN_AGE_MS = 20_000;
