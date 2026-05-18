export type VisitorSubscriptionPlan = "trial" | "basic" | "enterprise";

export type VisitorSubscriptionRow = {
  owner_id: string;
  plan: VisitorSubscriptionPlan;
  trial_ends_at: string | null;
  subscribed_at: string | null;
  billing_interval: "monthly" | "annual" | null;
  current_period_ends_at?: string | null;
  last_payment_reference?: string | null;
  last_transaction_id?: string | null;
  created_at: string;
  updated_at: string;
};

export type VisitorSubscriptionState = {
  plan: VisitorSubscriptionPlan;
  trialEndsAt: string | null;
  subscribedAt: string | null;
  billingInterval: "monthly" | "annual" | null;
  currentPeriodEndsAt: string | null;
  isActive: boolean;
  isTrial: boolean;
  isTrialExpired: boolean;
  daysLeftOnTrial: number | null;
};

export const VISITOR_TRIAL_DAYS = 7;

export const VISITOR_PLAN_LABELS: Record<VisitorSubscriptionPlan, string> = {
  trial: "Free for 7 days",
  basic: "Basic",
  enterprise: "Enterprise",
};

export function parseVisitorPlan(raw: string | null | undefined): VisitorSubscriptionPlan {
  const s = String(raw ?? "").toLowerCase();
  if (s === "basic" || s === "enterprise") return s;
  return "trial";
}

export function mapSubscriptionRow(row: VisitorSubscriptionRow | null): VisitorSubscriptionState {
  const plan = parseVisitorPlan(row?.plan);
  const trialEndsAt = row?.trial_ends_at ?? null;
  const now = Date.now();
  const trialEndMs = trialEndsAt ? new Date(trialEndsAt).getTime() : null;
  const isTrial = plan === "trial";
  const isTrialExpired = isTrial && trialEndMs !== null && trialEndMs < now;
  const periodEndsAt = row?.current_period_ends_at ?? null;
  const periodEndMs = periodEndsAt ? new Date(periodEndsAt).getTime() : null;
  const isPaidPlan = plan === "basic" || plan === "enterprise";
  const isPaidActive =
    isPaidPlan &&
    (periodEndMs === null || Number.isNaN(periodEndMs) || periodEndMs >= now);
  const isTrialActive = isTrial && trialEndMs !== null && trialEndMs >= now;
  const isActive = isPaidActive || isTrialActive;

  let daysLeftOnTrial: number | null = null;
  if (isTrial && trialEndMs !== null && trialEndMs >= now) {
    daysLeftOnTrial = Math.max(0, Math.ceil((trialEndMs - now) / (24 * 60 * 60 * 1000)));
  }

  return {
    plan,
    trialEndsAt,
    subscribedAt: row?.subscribed_at ?? null,
    billingInterval: row?.billing_interval ?? null,
    currentPeriodEndsAt: periodEndsAt,
    isActive,
    isTrial,
    isTrialExpired,
    daysLeftOnTrial,
  };
}

export function defaultTrialEndsAt(from = new Date()): string {
  const d = new Date(from);
  d.setUTCDate(d.getUTCDate() + VISITOR_TRIAL_DAYS);
  return d.toISOString();
}

export function formatSubscriptionExpiryDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** Platform Fusion Xpress admins (not visitor-only clients) skip subscription enforcement. */
export function isExemptFromVisitorSubscription(params: {
  isAdmin: boolean;
  isVisitorOnly: boolean;
}): boolean {
  if (params.isAdmin) return true;
  if (!params.isVisitorOnly) return true;
  return false;
}

export type VisitorPlanFeatureKey =
  | "unlimited_checkin"
  | "unlimited_preregister"
  | "auto_checkout"
  | "fast_record_entry"
  | "data_export"
  | "group_checkin"
  | "employee_module"
  | "reception_qr_device"
  | "real_estate_crm"
  | "employee_excel"
  | "notification_admins";

const PLAN_FEATURES: Record<VisitorPlanFeatureKey, Record<VisitorSubscriptionPlan, boolean>> = {
  unlimited_checkin: { trial: false, basic: true, enterprise: true },
  unlimited_preregister: { trial: false, basic: true, enterprise: true },
  auto_checkout: { trial: false, basic: true, enterprise: true },
  fast_record_entry: { trial: false, basic: true, enterprise: true },
  data_export: { trial: true, basic: true, enterprise: true },
  group_checkin: { trial: true, basic: true, enterprise: true },
  employee_module: { trial: false, basic: true, enterprise: true },
  reception_qr_device: { trial: false, basic: true, enterprise: true },
  real_estate_crm: { trial: false, basic: false, enterprise: true },
  employee_excel: { trial: false, basic: true, enterprise: true },
  notification_admins: { trial: false, basic: true, enterprise: true },
};

export function planHasFeature(
  plan: VisitorSubscriptionPlan,
  feature: VisitorPlanFeatureKey,
  subscriptionActive: boolean
): boolean {
  if (!subscriptionActive && plan === "trial") return false;
  return PLAN_FEATURES[feature][plan] ?? false;
}

export const VISITOR_CHECKIN_TRIAL_LIMIT = 1000;
export const VISITOR_PREREGISTER_TRIAL_LIMIT = 500;
