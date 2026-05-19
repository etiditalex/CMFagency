import type { SupabaseClient } from "@supabase/supabase-js";

import {
  defaultTrialEndsAt,
  mapSubscriptionRow,
  parseVisitorPlan,
  type VisitorSubscriptionPlan,
  type VisitorSubscriptionRow,
  type VisitorSubscriptionState,
} from "@/lib/visitors/subscription";

export async function getVisitorSubscription(
  admin: SupabaseClient,
  ownerId: string
): Promise<VisitorSubscriptionState> {
  const { data, error } = await admin
    .from("visitor_management_subscriptions")
    .select(
      "owner_id,plan,trial_ends_at,subscribed_at,billing_interval,current_period_ends_at,last_payment_reference,last_transaction_id,created_at,updated_at"
    )
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
    .select(
      "owner_id,plan,trial_ends_at,subscribed_at,billing_interval,current_period_ends_at,last_payment_reference,last_transaction_id,created_at,updated_at"
    )
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
    .select(
      "owner_id,plan,trial_ends_at,subscribed_at,billing_interval,current_period_ends_at,last_payment_reference,last_transaction_id,created_at,updated_at"
    )
    .single();

  if (error) {
    return mapSubscriptionRow({ ...row, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
  }
  return mapSubscriptionRow(data as VisitorSubscriptionRow);
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
    .select(
      "owner_id,plan,trial_ends_at,subscribed_at,billing_interval,current_period_ends_at,last_payment_reference,last_transaction_id,created_at,updated_at"
    )
    .single();

  if (error) throw new Error(error.message);
  return mapSubscriptionRow(data as VisitorSubscriptionRow);
}

export function isMissingSubscriptionTable(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error ?? "");
  return msg.includes("visitor_management_subscriptions") || msg.includes("does not exist");
}
