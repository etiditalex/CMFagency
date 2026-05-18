import type { SupabaseClient } from "@supabase/supabase-js";

import {
  computeSubscriptionPeriodEndsAt,
  isVisitorSubscriptionPaymentMetadata,
  parseBillingInterval,
  parsePaidVisitorPlan,
  type PaidVisitorPlan,
  type VisitorBillingInterval,
} from "@/lib/visitors/subscription-pricing";

export async function fulfillVisitorManagementSubscriptionPayment(
  supabase: SupabaseClient,
  tx: { id: string; metadata: unknown }
): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  const meta =
    typeof tx.metadata === "object" && tx.metadata !== null && !Array.isArray(tx.metadata)
      ? (tx.metadata as Record<string, unknown>)
      : {};

  if (!isVisitorSubscriptionPaymentMetadata(meta)) {
    return { ok: true, skipped: true };
  }

  const ownerId = String(meta.visitor_subscription_owner_id ?? "").trim();
  const plan = parsePaidVisitorPlan(String(meta.visitor_subscription_plan ?? ""));
  const billingInterval = parseBillingInterval(
    String(meta.visitor_subscription_billing_interval ?? "monthly")
  );

  if (!ownerId || !plan) {
    return { ok: false, error: "Invalid visitor subscription payment metadata" };
  }

  const periodEndsAt = computeSubscriptionPeriodEndsAt(billingInterval);
  const reference =
    typeof meta.payment_reference === "string"
      ? meta.payment_reference
      : typeof meta.slug === "string"
        ? meta.slug
        : null;

  const patch = {
    owner_id: ownerId,
    plan,
    billing_interval: billingInterval,
    subscribed_at: new Date().toISOString(),
    current_period_ends_at: periodEndsAt,
    trial_ends_at: null,
    last_payment_reference: reference,
    last_transaction_id: tx.id,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("visitor_management_subscriptions")
    .upsert(patch, { onConflict: "owner_id" });

  if (error) {
    return { ok: false, error: error.message };
  }

  await supabase
    .from("transactions")
    .update({ fulfilled_at: new Date().toISOString() } as Record<string, unknown>)
    .eq("id", tx.id)
    .is("fulfilled_at", null);

  return { ok: true };
}

export type { PaidVisitorPlan, VisitorBillingInterval };
