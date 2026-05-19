import type { SupabaseClient } from "@supabase/supabase-js";

import { isVisitorDemoAccount } from "@/lib/visitors/demo-accounts";
import {
  defaultPromoEnterpriseEndsAt,
  isVisitorPromoEnterpriseEmail,
} from "@/lib/visitors/promo-enterprise-accounts";
import {
  defaultTrialEndsAt,
  mapSubscriptionRow,
  visitorDemoSubscriptionState,
  type VisitorSubscriptionPlan,
  type VisitorSubscriptionRow,
  type VisitorSubscriptionState,
} from "@/lib/visitors/subscription";

const SUBSCRIPTION_SELECT =
  "owner_id,plan,trial_ends_at,subscribed_at,billing_interval,current_period_ends_at,last_payment_reference,last_transaction_id,created_at,updated_at";

export function hasPaidSubscription(
  row:
    | Pick<VisitorSubscriptionRow, "last_payment_reference" | "last_transaction_id">
    | null
    | undefined
): boolean {
  if (!row) return false;
  return Boolean(String(row.last_payment_reference ?? "").trim() || row.last_transaction_id);
}

export async function getVisitorSubscription(
  admin: SupabaseClient,
  ownerId: string
): Promise<VisitorSubscriptionState> {
  const { data, error } = await admin
    .from("visitor_management_subscriptions")
    .select(SUBSCRIPTION_SELECT)
    .eq("owner_id", ownerId)
    .maybeSingle();

  if (error || !data) {
    return mapSubscriptionRow(null);
  }
  return mapSubscriptionRow(data as VisitorSubscriptionRow);
}

export async function ensureVisitorTrialSubscription(
  admin: SupabaseClient,
  ownerId: string
): Promise<VisitorSubscriptionState> {
  const { data: existing } = await admin
    .from("visitor_management_subscriptions")
    .select(SUBSCRIPTION_SELECT)
    .eq("owner_id", ownerId)
    .maybeSingle();

  if (existing) return mapSubscriptionRow(existing as VisitorSubscriptionRow);

  const row = {
    owner_id: ownerId,
    plan: "trial" as const,
    trial_ends_at: defaultTrialEndsAt(),
    subscribed_at: null,
    billing_interval: null,
  };

  const { data, error } = await admin
    .from("visitor_management_subscriptions")
    .upsert(row, { onConflict: "owner_id" })
    .select(SUBSCRIPTION_SELECT)
    .single();

  if (error) {
    return mapSubscriptionRow({ ...row, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
  }
  return mapSubscriptionRow(data as VisitorSubscriptionRow);
}

/** 7-day complimentary Enterprise (Professional + Real Estate). Expires to inactive trial unless upgraded. */
export async function ensureVisitorPromoEnterpriseSubscription(
  admin: SupabaseClient,
  ownerId: string
): Promise<VisitorSubscriptionState> {
  const { data: existing } = await admin
    .from("visitor_management_subscriptions")
    .select(SUBSCRIPTION_SELECT)
    .eq("owner_id", ownerId)
    .maybeSingle();

  const row = existing as VisitorSubscriptionRow | null;
  const now = Date.now();

  if (row && hasPaidSubscription(row)) {
    return mapSubscriptionRow(row);
  }

  if (row?.plan === "enterprise" && row.current_period_ends_at) {
    const periodEndMs = new Date(row.current_period_ends_at).getTime();
    if (periodEndMs >= now) {
      return mapSubscriptionRow(row);
    }
    if (!hasPaidSubscription(row)) {
      const { data: downgraded, error } = await admin
        .from("visitor_management_subscriptions")
        .update({
          plan: "trial",
          trial_ends_at: row.current_period_ends_at,
          subscribed_at: null,
          billing_interval: null,
          current_period_ends_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq("owner_id", ownerId)
        .select(SUBSCRIPTION_SELECT)
        .single();
      if (!error && downgraded) {
        return mapSubscriptionRow(downgraded as VisitorSubscriptionRow);
      }
    }
  }

  const periodEnd = defaultPromoEnterpriseEndsAt();
  const promoRow = {
    owner_id: ownerId,
    plan: "enterprise" as const,
    subscribed_at: new Date().toISOString(),
    current_period_ends_at: periodEnd,
    trial_ends_at: null,
    billing_interval: null,
  };

  const { data, error } = await admin
    .from("visitor_management_subscriptions")
    .upsert(promoRow, { onConflict: "owner_id" })
    .select(SUBSCRIPTION_SELECT)
    .single();

  if (error) {
    return mapSubscriptionRow({
      ...promoRow,
      last_payment_reference: null,
      last_transaction_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }
  return mapSubscriptionRow(data as VisitorSubscriptionRow);
}

/** Resolve subscription for a visitor-only account (demo, promo, trial, or paid). */
export async function resolveVisitorSubscriptionForOwner(
  admin: SupabaseClient,
  ownerId: string,
  email: string | null | undefined
): Promise<VisitorSubscriptionState> {
  if (isVisitorDemoAccount(email)) {
    return visitorDemoSubscriptionState();
  }

  if (isVisitorPromoEnterpriseEmail(email)) {
    return ensureVisitorPromoEnterpriseSubscription(admin, ownerId);
  }

  let subscription = await getVisitorSubscription(admin, ownerId);
  if (!subscription.trialEndsAt && subscription.plan === "trial" && !subscription.subscribedAt) {
    subscription = await ensureVisitorTrialSubscription(admin, ownerId);
  }
  return subscription;
}

export async function updateVisitorSubscriptionPlan(
  admin: SupabaseClient,
  ownerId: string,
  plan: VisitorSubscriptionPlan,
  billingInterval?: "monthly" | "annual" | null
): Promise<VisitorSubscriptionState> {
  const patch: Record<string, unknown> = {
    plan,
    updated_at: new Date().toISOString(),
  };

  if (plan === "professional" || plan === "enterprise") {
    patch.subscribed_at = new Date().toISOString();
    patch.billing_interval = billingInterval ?? "monthly";
  }

  const { data, error } = await admin
    .from("visitor_management_subscriptions")
    .upsert({ owner_id: ownerId, ...patch }, { onConflict: "owner_id" })
    .select(SUBSCRIPTION_SELECT)
    .single();

  if (error) throw new Error(error.message);
  return mapSubscriptionRow(data as VisitorSubscriptionRow);
}

export function isMissingSubscriptionTable(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error ?? "");
  return msg.includes("visitor_management_subscriptions") || msg.includes("does not exist");
}
