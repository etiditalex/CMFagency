import type { SupabaseClient } from "@supabase/supabase-js";

import type { CampaignRow } from "@/lib/ensure-cfma-campaigns";
import {
  VISITOR_PAYSTACK_CURRENCY,
  VISITOR_SUBSCRIPTION_CAMPAIGN_SLUG,
} from "@/lib/visitors/subscription-pricing";

/**
 * Billing campaign for Smart Visitor Management subscriptions (Paystack + M-Pesa).
 * Transaction amounts are set per checkout; campaign unit_amount is a placeholder.
 */
export async function ensureVisitorSubscriptionCampaign(
  supabaseAdmin: SupabaseClient
): Promise<CampaignRow | null> {
  const slug = VISITOR_SUBSCRIPTION_CAMPAIGN_SLUG;
  const { data: existing } = await supabaseAdmin
    .from("campaigns")
    .select("id,created_by,type,slug,title,currency,unit_amount,max_per_txn,is_active")
    .eq("slug", slug)
    .maybeSingle();

  if (existing) {
    return existing as CampaignRow;
  }

  let adminId: string | null = null;
  try {
    const { data: pm } = await supabaseAdmin
      .from("portal_members")
      .select("user_id")
      .eq("role", "admin")
      .limit(1)
      .maybeSingle();
    if (pm?.user_id) adminId = pm.user_id as string;
    if (!adminId) {
      const { data: au } = await supabaseAdmin
        .from("admin_users")
        .select("user_id")
        .limit(1)
        .maybeSingle();
      if (au?.user_id) adminId = au.user_id as string;
    }
  } catch (e) {
    console.warn("ensureVisitorSubscriptionCampaign: could not fetch admin", e);
  }

  if (!adminId) {
    console.warn("ensureVisitorSubscriptionCampaign: No admin user found to own campaign.");
    return null;
  }

  const { data: inserted, error } = await supabaseAdmin
    .from("campaigns")
    .insert({
      type: "ticket",
      slug,
      title: "Smart Visitor Management — subscription",
      description: "Fusion Xpress Smart Visitor Management plan (Professional or Enterprise).",
      currency: VISITOR_PAYSTACK_CURRENCY,
      unit_amount: 1,
      max_per_txn: 1,
      is_active: true,
      created_by: adminId,
    })
    .select("id,created_by,type,slug,title,currency,unit_amount,max_per_txn")
    .single();

  if (error) {
    console.error("ensureVisitorSubscriptionCampaign: insert failed", error);
    return null;
  }

  return inserted as CampaignRow;
}
