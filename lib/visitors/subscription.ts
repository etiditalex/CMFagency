import { isVisitorDemoAccount } from "@/lib/visitors/demo-accounts";

export type VisitorSubscriptionPlan = "trial" | "professional" | "enterprise";

export type VisitorSubscriptionRow = {
  owner_id: string;
  plan: VisitorSubscriptionPlan;
  trial_ends_at: string | null;
  subscribed_at: string | null;
  billing_interval: "monthly" | "annual" | null;
  current_period_ends_at?: string | null;
  last_payment_reference?: string | null;
  last_transaction_id?: string | null;
  admin_extension_active?: boolean;
  admin_extension_ends_at?: string | null;
  admin_extension_plan?: "enterprise" | null;
  admin_extension_note?: string | null;
  admin_extension_granted_by?: string | null;
  admin_extension_granted_at?: string | null;
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

/** Dispatched on `window` when inline/M-Pesa subscription payment completes (client-only). */
export const VISITOR_SUBSCRIPTION_PAID_EVENT = "visitor-subscription-paid";

export const VISITOR_PLAN_LABELS: Record<VisitorSubscriptionPlan, string> = {
  trial: "Free for 7 days",
  professional: "Professional",
  enterprise: "Enterprise",
};

/** Maps stored plan slugs (including legacy `basic`) to the current plan id. */
export function parseVisitorPlan(raw: string | null | undefined): VisitorSubscriptionPlan {
  const s = String(raw ?? "").toLowerCase();
  if (s === "basic" || s === "professional") return "professional";
  if (s === "enterprise") return "enterprise";
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
  const isPaidPlan = plan === "professional" || plan === "enterprise";
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

/** Platform admins, non–visitor-only users, and demo accounts skip subscription enforcement. */
export function isExemptFromVisitorSubscription(params: {
  isAdmin: boolean;
  isVisitorOnly: boolean;
  email?: string | null;
}): boolean {
  if (params.isAdmin) return true;
  if (!params.isVisitorOnly) return true;
  if (isVisitorDemoAccount(params.email)) return true;
  return false;
}

/** Client-side feature gate: demo accounts and exempt users get every visitor plan feature. */
export function accountHasVisitorFeature(params: {
  isAdmin: boolean;
  isVisitorOnly: boolean;
  email?: string | null;
  plan: VisitorSubscriptionPlan;
  feature: VisitorPlanFeatureKey;
  subscriptionActive: boolean;
}): boolean {
  if (
    isExemptFromVisitorSubscription({
      isAdmin: params.isAdmin,
      isVisitorOnly: params.isVisitorOnly,
      email: params.email,
    })
  ) {
    return true;
  }
  return planHasFeature(params.plan, params.feature, params.subscriptionActive);
}

/** Active Enterprise subscription state used for demo accounts in API/UI. */
export function visitorDemoSubscriptionState(): VisitorSubscriptionState {
  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setUTCFullYear(periodEnd.getUTCFullYear() + 10);

  return {
    plan: "enterprise",
    trialEndsAt: null,
    subscribedAt: now.toISOString(),
    billingInterval: "annual",
    currentPeriodEndsAt: periodEnd.toISOString(),
    isActive: true,
    isTrial: false,
    isTrialExpired: false,
    daysLeftOnTrial: null,
  };
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
  | "notification_admins"
  | "gps_tracking"
  | "employee_qr_download";

const PLAN_FEATURES: Record<VisitorPlanFeatureKey, Record<VisitorSubscriptionPlan, boolean>> = {
  unlimited_checkin: { trial: false, professional: true, enterprise: true },
  unlimited_preregister: { trial: false, professional: true, enterprise: true },
  auto_checkout: { trial: false, professional: true, enterprise: true },
  fast_record_entry: { trial: false, professional: true, enterprise: true },
  data_export: { trial: true, professional: true, enterprise: true },
  group_checkin: { trial: true, professional: true, enterprise: true },
  employee_module: { trial: false, professional: true, enterprise: true },
  reception_qr_device: { trial: false, professional: true, enterprise: true },
  real_estate_crm: { trial: false, professional: false, enterprise: true },
  employee_excel: { trial: false, professional: true, enterprise: true },
  notification_admins: { trial: false, professional: true, enterprise: true },
  gps_tracking: { trial: true, professional: true, enterprise: true },
  employee_qr_download: { trial: false, professional: true, enterprise: true },
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
