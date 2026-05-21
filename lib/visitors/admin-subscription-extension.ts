import type { SupabaseClient } from "@supabase/supabase-js";

import {
  mapSubscriptionRow,
  type VisitorSubscriptionPlan,
  type VisitorSubscriptionRow,
  type VisitorSubscriptionState,
} from "@/lib/visitors/subscription";

export const VISITOR_SUBSCRIPTION_SELECT_WITH_EXTENSION =
  "owner_id,plan,trial_ends_at,subscribed_at,billing_interval,current_period_ends_at,last_payment_reference,last_transaction_id,admin_extension_active,admin_extension_ends_at,admin_extension_plan,admin_extension_note,admin_extension_granted_by,admin_extension_granted_at,created_at,updated_at";

function hasPaidSubscription(
  row: Pick<VisitorSubscriptionRow, "last_payment_reference" | "last_transaction_id"> | null | undefined
): boolean {
  if (!row) return false;
  return Boolean(String(row.last_payment_reference ?? "").trim() || row.last_transaction_id);
}

export type AdminExtensionPlan = "enterprise";

export type AdminExtensionFields = {
  admin_extension_active: boolean;
  admin_extension_ends_at: string | null;
  admin_extension_plan: AdminExtensionPlan | null;
  admin_extension_note: string | null;
  admin_extension_granted_by: string | null;
  admin_extension_granted_at: string | null;
};

export function extensionEndsAtFromDays(days: number, from = new Date()): string {
  const n = Math.min(365, Math.max(1, Math.floor(days)));
  const d = new Date(from);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString();
}

export function isAdminExtensionActive(
  row: Partial<AdminExtensionFields> | null | undefined,
  now = Date.now()
): boolean {
  if (!row?.admin_extension_active) return false;
  const ends = row.admin_extension_ends_at;
  if (!ends) return false;
  const endMs = new Date(ends).getTime();
  return !Number.isNaN(endMs) && endMs >= now;
}

export function adminExtensionSubscriptionState(
  row: Pick<AdminExtensionFields, "admin_extension_ends_at" | "admin_extension_plan">
): VisitorSubscriptionState {
  const plan: VisitorSubscriptionPlan =
    row.admin_extension_plan === "enterprise" ? "enterprise" : "enterprise";
  const periodEnd = row.admin_extension_ends_at ?? null;
  const now = new Date().toISOString();

  return {
    plan,
    trialEndsAt: null,
    subscribedAt: now,
    billingInterval: null,
    currentPeriodEndsAt: periodEnd,
    isActive: true,
    isTrial: false,
    isTrialExpired: false,
    daysLeftOnTrial: null,
  };
}

/** Apply complimentary Enterprise (Professional + Enterprise features) until ends_at. */
export async function applyAdminSubscriptionExtension(
  admin: SupabaseClient,
  ownerId: string,
  params: {
    days: number;
    plan?: AdminExtensionPlan;
    note?: string | null;
    grantedByUserId: string;
  }
): Promise<VisitorSubscriptionState> {
  const plan = params.plan ?? "enterprise";
  const endsAt = extensionEndsAtFromDays(params.days);
  const now = new Date().toISOString();
  const note = String(params.note ?? "").trim() || null;

  const { data, error } = await admin
    .from("visitor_management_subscriptions")
    .upsert(
      {
        owner_id: ownerId,
        plan,
        subscribed_at: now,
        current_period_ends_at: endsAt,
        trial_ends_at: null,
        billing_interval: null,
        admin_extension_active: true,
        admin_extension_ends_at: endsAt,
        admin_extension_plan: plan,
        admin_extension_note: note,
        admin_extension_granted_by: params.grantedByUserId,
        admin_extension_granted_at: now,
        updated_at: now,
      },
      { onConflict: "owner_id" }
    )
    .select(VISITOR_SUBSCRIPTION_SELECT_WITH_EXTENSION)
    .single();

  if (error) throw new Error(error.message);
  return mapSubscriptionRow(data as VisitorSubscriptionRow);
}

/** Turn off dashboard extension; downgrade unpaid complimentary access to expired trial. */
export async function revokeAdminSubscriptionExtension(
  admin: SupabaseClient,
  ownerId: string
): Promise<VisitorSubscriptionState> {
  const { data: row } = await admin
    .from("visitor_management_subscriptions")
    .select(VISITOR_SUBSCRIPTION_SELECT_WITH_EXTENSION)
    .eq("owner_id", ownerId)
    .maybeSingle();

  const fullRow = row as VisitorSubscriptionRow | null;
  const now = new Date().toISOString();

  if (fullRow && hasPaidSubscription(fullRow)) {
    const { data, error } = await admin
      .from("visitor_management_subscriptions")
      .update({
        admin_extension_active: false,
        admin_extension_ends_at: null,
        admin_extension_plan: null,
        admin_extension_note: null,
        updated_at: now,
      })
      .eq("owner_id", ownerId)
      .select(VISITOR_SUBSCRIPTION_SELECT_WITH_EXTENSION)
      .single();
    if (error) throw new Error(error.message);
    return mapSubscriptionRow(data as VisitorSubscriptionRow);
  }

  const endedAt = fullRow?.admin_extension_ends_at ?? fullRow?.current_period_ends_at ?? now;
  const { data, error } = await admin
    .from("visitor_management_subscriptions")
    .upsert(
      {
        owner_id: ownerId,
        plan: "trial",
        trial_ends_at: endedAt,
        subscribed_at: null,
        billing_interval: null,
        current_period_ends_at: null,
        admin_extension_active: false,
        admin_extension_ends_at: null,
        admin_extension_plan: null,
        admin_extension_note: null,
        admin_extension_granted_by: null,
        admin_extension_granted_at: null,
        updated_at: now,
      },
      { onConflict: "owner_id" }
    )
    .select(VISITOR_SUBSCRIPTION_SELECT_WITH_EXTENSION)
    .single();

  if (error) throw new Error(error.message);
  return mapSubscriptionRow(data as VisitorSubscriptionRow);
}

export async function syncExpiredAdminExtension(
  admin: SupabaseClient,
  ownerId: string,
  row: VisitorSubscriptionRow | null
): Promise<VisitorSubscriptionState | null> {
  if (!row?.admin_extension_active || !row.admin_extension_ends_at) return null;
  if (isAdminExtensionActive(row)) return null;
  return revokeAdminSubscriptionExtension(admin, ownerId);
}
