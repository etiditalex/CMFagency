import { normalizeVisitorAccountEmail } from "@/lib/visitors/demo-accounts";
import { VISITOR_TRIAL_DAYS } from "@/lib/visitors/subscription";

/** Complimentary full Enterprise access for 7 days, then standard expired trial until upgrade. */
export const VISITOR_PROMO_ENTERPRISE_EMAILS: readonly string[] = [
  "inukaproperties@gmail.com",
  "lemartmsa@gmail.com",
];

function promoEmailsFromEnv(): string[] {
  const raw = process.env.VISITOR_PROMO_ENTERPRISE_EMAILS ?? "";
  return raw
    .split(",")
    .map((e) => normalizeVisitorAccountEmail(e))
    .filter(Boolean);
}

export function isVisitorPromoEnterpriseEmail(email: string | null | undefined): boolean {
  const normalized = normalizeVisitorAccountEmail(email);
  if (!normalized) return false;
  if (VISITOR_PROMO_ENTERPRISE_EMAILS.includes(normalized)) return true;
  return promoEmailsFromEnv().includes(normalized);
}

export function defaultPromoEnterpriseEndsAt(from = new Date()): string {
  const d = new Date(from);
  d.setUTCDate(d.getUTCDate() + VISITOR_TRIAL_DAYS);
  return d.toISOString();
}
