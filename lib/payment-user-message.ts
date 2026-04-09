/**
 * Public checkout (votes / tickets / cart): never surface raw API, DB, or provider errors.
 * Use {@link PaymentClientError} only for simple client-side validation the user can fix.
 */

export const GENERIC_PAYMENT_FAILURE =
  "We couldn't complete your payment. Please try again in a moment, or use another payment method. If it keeps happening, contact the organizer.";

/** Safe to show — fixed wording only, no server/provider text. */
export class PaymentClientError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PaymentClientError";
  }
}

export function messageForPaymentFailure(err: unknown): string {
  if (err instanceof PaymentClientError) return err.message;
  return GENERIC_PAYMENT_FAILURE;
}

export const GENERIC_CAMPAIGN_LOAD_FAILURE =
  "We couldn't load this page. Please check the link or try again later.";

export const GENERIC_VOTING_HUB_LOAD_FAILURE =
  "We couldn't load voting right now. Please refresh the page or try again later.";
