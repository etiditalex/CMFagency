export type StkTransactionType = "CustomerPayBillOnline" | "CustomerBuyGoodsOnline";

/** Daraja STK Push limits TransactionDesc to 13 characters. */
export const STK_TRANSACTION_DESC_MAX = 13;

/** AccountReference is commonly limited to 12 characters. */
export const STK_ACCOUNT_REFERENCE_MAX = 12;

/**
 * Paybill → CustomerPayBillOnline (default).
 * Till / Buy Goods → set MPESA_STK_TRANSACTION_TYPE=CustomerBuyGoodsOnline in Vercel.
 */
export function resolveStkTransactionType(): StkTransactionType {
  const raw = (process.env.MPESA_STK_TRANSACTION_TYPE ?? "").trim();
  if (raw === "CustomerBuyGoodsOnline") return "CustomerBuyGoodsOnline";
  return "CustomerPayBillOnline";
}

export function parseMpesaBusinessShortCode(raw: string | undefined): number | null {
  const n = Number.parseInt(String(raw ?? "").trim(), 10);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

export function buildStkTransactionDesc(campaignType: string, quantity: number): string {
  const label = campaignType === "vote" ? "Vote" : "Ticket";
  const desc = `${label} x${quantity}`;
  return desc.slice(0, STK_TRANSACTION_DESC_MAX);
}

export function buildStkAccountReference(reference: string): string {
  return reference.replace(/[^A-Za-z0-9]/g, "").slice(0, STK_ACCOUNT_REFERENCE_MAX);
}

/** Daraja password = base64(shortCode + passkey + YYYYMMDDHHmmss). */
export function buildDarajaStkPassword(shortCode: number, passKey: string, timestamp: string): string {
  return Buffer.from(`${shortCode}${passKey}${timestamp}`).toString("base64");
}

export function darajaStkTimestamp(): string {
  return new Date().toISOString().slice(0, 19).replace(/-/g, "").replace(/:/g, "").replace(/T/g, "");
}

export type StkPushJson = {
  MerchantRequestID?: string;
  CheckoutRequestID?: string;
  ResponseCode?: string | number;
  ResponseDescription?: string;
  CustomerMessage?: string;
  errorMessage?: string;
};

export function isStkPushAccepted(stkJson: StkPushJson): boolean {
  const responseCode = String(stkJson.ResponseCode ?? "").trim();
  const acceptedByCode = !responseCode || responseCode === "0";
  return acceptedByCode && Boolean(stkJson.CheckoutRequestID);
}

export function describeStkPushFailure(stkJson: StkPushJson, httpStatus: number): string {
  const responseCode = String(stkJson.ResponseCode ?? "").trim();
  const base =
    stkJson.ResponseDescription ??
    stkJson.CustomerMessage ??
    stkJson.errorMessage ??
    `M-Pesa STK request failed (HTTP ${httpStatus}).`;

  if (responseCode && responseCode !== "0") {
    const tillHint =
      resolveStkTransactionType() === "CustomerPayBillOnline"
        ? " If your short code is a Till (not Paybill), set MPESA_STK_TRANSACTION_TYPE=CustomerBuyGoodsOnline in Vercel."
        : "";
    return `${base} (M-Pesa code ${responseCode}).${tillHint}`;
  }
  return base;
}
