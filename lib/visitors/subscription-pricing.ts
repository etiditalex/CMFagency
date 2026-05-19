import type { VisitorSubscriptionPlan } from "@/lib/visitors/subscription";

export type VisitorBillingInterval = "monthly" | "annual";

export type PaidVisitorPlan = Exclude<VisitorSubscriptionPlan, "trial">;

export const VISITOR_SUBSCRIPTION_CAMPAIGN_SLUG = "visitor-management-subscription";

type PriceRow = { aud: number; kes: number };

const PRICES: Record<PaidVisitorPlan, Record<VisitorBillingInterval, PriceRow>> = {
  professional: {
    monthly: { aud: 20, kes: 2600 },
    annual: { aud: 200, kes: 26000 },
  },
  enterprise: {
    monthly: { aud: 35.09, kes: 4575 },
    annual: { aud: 421.15, kes: 54900 },
  },
};

export function parseBillingInterval(raw: string | null | undefined): VisitorBillingInterval {
  return String(raw ?? "").toLowerCase() === "annual" ? "annual" : "monthly";
}

export function parsePaidVisitorPlan(raw: string | null | undefined): PaidVisitorPlan | null {
  const s = String(raw ?? "").toLowerCase();
  if (s === "basic" || s === "professional") return "professional";
  if (s === "enterprise") return s;
  return null;
}

export function getVisitorSubscriptionPrice(
  plan: PaidVisitorPlan,
  interval: VisitorBillingInterval
): PriceRow {
  return PRICES[plan][interval];
}

export function getVisitorSubscriptionAmountAud(plan: PaidVisitorPlan, interval: VisitorBillingInterval): number {
  return getVisitorSubscriptionPrice(plan, interval).aud;
}

export function getVisitorSubscriptionAmountKes(plan: PaidVisitorPlan, interval: VisitorBillingInterval): number {
  return getVisitorSubscriptionPrice(plan, interval).kes;
}

/** Paystack amount in smallest currency unit (cents for AUD). */
export function getVisitorSubscriptionPaystackSubunit(
  plan: PaidVisitorPlan,
  interval: VisitorBillingInterval
): number {
  return Math.round(getVisitorSubscriptionAmountAud(plan, interval) * 100);
}

export function formatVisitorSubscriptionPriceLabel(
  plan: PaidVisitorPlan,
  interval: VisitorBillingInterval
): { aud: string; kes: string } {
  const row = getVisitorSubscriptionPrice(plan, interval);
  const audFmt =
    interval === "monthly"
      ? `$${row.aud.toFixed(2)} AUD / month`
      : `$${row.aud.toFixed(2)} AUD / year`;
  const kesFmt =
    interval === "monthly"
      ? `KES ${row.kes.toLocaleString()} / month`
      : `KES ${row.kes.toLocaleString()} / year`;
  return { aud: audFmt, kes: kesFmt };
}

export function computeSubscriptionPeriodEndsAt(
  interval: VisitorBillingInterval,
  from = new Date()
): string {
  const d = new Date(from);
  if (interval === "annual") {
    d.setUTCFullYear(d.getUTCFullYear() + 1);
  } else {
    d.setUTCMonth(d.getUTCMonth() + 1);
  }
  return d.toISOString();
}

export function isVisitorSubscriptionPaymentMetadata(meta: Record<string, unknown>): boolean {
  return meta.visitor_management_subscription === true;
}

export function buildVisitorSubscriptionPaymentMetadata(params: {
  ownerId: string;
  plan: PaidVisitorPlan;
  billingInterval: VisitorBillingInterval;
  slug: string;
  campaignTitle: string;
  phone?: string | null;
}): Record<string, unknown> {
  return {
    slug: params.slug,
    campaign_title: params.campaignTitle,
    visitor_management_subscription: true,
    visitor_subscription_owner_id: params.ownerId,
    visitor_subscription_plan: params.plan,
    visitor_subscription_billing_interval: params.billingInterval,
    ...(params.phone ? { phone: params.phone } : {}),
  };
}
