import type { VisitorSubscriptionPlan } from "@/lib/visitors/subscription";

export type VisitorBillingInterval = "monthly" | "annual";

export type PaidVisitorPlan = Exclude<VisitorSubscriptionPlan, "trial">;

export const VISITOR_SUBSCRIPTION_CAMPAIGN_SLUG = "visitor-management-subscription";

type PriceRow = { usd: number; kes: number };

const MONTHLY_PRICES: Record<PaidVisitorPlan, PriceRow> = {
  professional: { usd: 12.6, kes: 1638 },
  enterprise: { usd: 35.09, kes: 4575 },
};

function annualFromMonthly(monthly: PriceRow): PriceRow {
  return {
    usd: Math.round(monthly.usd * 12 * 100) / 100,
    kes: monthly.kes * 12,
  };
}

const PRICES: Record<PaidVisitorPlan, Record<VisitorBillingInterval, PriceRow>> = {
  professional: {
    monthly: MONTHLY_PRICES.professional,
    annual: annualFromMonthly(MONTHLY_PRICES.professional),
  },
  enterprise: {
    monthly: MONTHLY_PRICES.enterprise,
    annual: annualFromMonthly(MONTHLY_PRICES.enterprise),
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

/** Paystack / card amount (stored as USD list price; charged in AUD via Paystack). */
export function getVisitorSubscriptionAmountUsd(
  plan: PaidVisitorPlan,
  interval: VisitorBillingInterval
): number {
  return getVisitorSubscriptionPrice(plan, interval).usd;
}

/** @deprecated Use getVisitorSubscriptionAmountUsd */
export function getVisitorSubscriptionAmountAud(
  plan: PaidVisitorPlan,
  interval: VisitorBillingInterval
): number {
  return getVisitorSubscriptionAmountUsd(plan, interval);
}

export function getVisitorSubscriptionAmountKes(
  plan: PaidVisitorPlan,
  interval: VisitorBillingInterval
): number {
  return getVisitorSubscriptionPrice(plan, interval).kes;
}

/** Paystack amount in smallest currency unit (cents). */
export function getVisitorSubscriptionPaystackSubunit(
  plan: PaidVisitorPlan,
  interval: VisitorBillingInterval
): number {
  return Math.round(getVisitorSubscriptionAmountUsd(plan, interval) * 100);
}

export function formatVisitorSubscriptionPriceLabel(
  plan: PaidVisitorPlan,
  interval: VisitorBillingInterval
): { usd: string; kes: string } {
  const row = getVisitorSubscriptionPrice(plan, interval);
  const usdFmt =
    interval === "monthly"
      ? `$${row.usd.toFixed(2)} / month`
      : `$${row.usd.toFixed(2)} / year (12 months)`;
  const kesFmt =
    interval === "monthly"
      ? `KES ${row.kes.toLocaleString()} / month`
      : `KES ${row.kes.toLocaleString()} / year (12 months)`;
  return { usd: usdFmt, kes: kesFmt };
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
