import { fetchDarajaAccessToken } from "@/lib/daraja-oauth";
import {
  buildDarajaStkPassword,
  darajaStkTimestamp,
  parseMpesaBusinessShortCode,
} from "@/lib/daraja-stk-config";
import { parseDarajaStkQueryResponse, type ParsedDarajaStkQuery } from "@/lib/daraja-stk-query-parse";
import { getStkMetadataItem, isStkQueryStillPending, type StkMetadataItem } from "@/lib/daraja-stk-result";

export type SafaricomStkQuery =
  | { ok: true; parsed: ParsedDarajaStkQuery }
  | { ok: false; error: string };

/**
 * Ask Safaricom whether this checkout was actually paid.
 * Callback bodies are not proof of payment.
 */
export async function querySafaricomStkCheckout(checkoutRequestId: string): Promise<SafaricomStkQuery> {
  const id = checkoutRequestId.trim();
  if (!id || id.length > 80) return { ok: false, error: "Invalid checkout id" };

  const passKey = process.env.MPESA_PASSKEY;
  const baseUrl = (process.env.MPESA_BASE_URL ?? "https://sandbox.safaricom.co.ke").replace(/\/$/, "");
  const stkQueryUrl = process.env.MPESA_STKPUSH_QUERY_URL ?? `${baseUrl}/mpesa/stkpushquery/v1/query`;
  const businessShortCode = parseMpesaBusinessShortCode(process.env.MPESA_SHORTCODE);
  if (!passKey || !businessShortCode) return { ok: false, error: "M-Pesa not configured" };

  const tokenResult = await fetchDarajaAccessToken();
  if (!tokenResult.ok) return { ok: false, error: tokenResult.error };

  const timestamp = darajaStkTimestamp();
  const password = buildDarajaStkPassword(businessShortCode, passKey, timestamp);

  let queryRes: Response;
  try {
    queryRes = await fetch(stkQueryUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenResult.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        BusinessShortCode: businessShortCode,
        Password: password,
        Timestamp: timestamp,
        CheckoutRequestID: id,
      }),
    });
  } catch {
    return { ok: false, error: "M-Pesa query failed" };
  }

  const queryJson: unknown = await queryRes.json().catch(() => ({}));
  if (!queryRes.ok) return { ok: false, error: "M-Pesa query was not accepted" };

  const parsed = parseDarajaStkQueryResponse(queryJson);
  if (!parsed.parseOk) return { ok: false, error: "M-Pesa query could not be read" };
  return { ok: true, parsed };
}

export type SafaricomStkDecision = "paid" | "pending" | "failed";

export function safaricomStkDecision(parsed: ParsedDarajaStkQuery): SafaricomStkDecision {
  if (parsed.resultCode === 0) return "paid";
  if (isStkQueryStillPending(parsed.resultCode, parsed.resultDesc, parsed.items)) return "pending";
  return "failed";
}

/**
 * When Safaricom includes an amount, it must match the order.
 * A confirmed checkout with no amount still matches, because the prompt was created for that amount.
 */
export function stkPaidAmountMatches(items: StkMetadataItem[], expected: number): boolean {
  const raw = getStkMetadataItem(items, "Amount");
  if (raw === undefined || raw === null || String(raw).trim() === "") return true;
  const paid = Number(raw);
  const due = Number(expected);
  return Number.isFinite(paid) && Number.isFinite(due) && Math.abs(paid - due) <= 1;
}
