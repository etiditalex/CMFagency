import type { SupabaseClient } from "@supabase/supabase-js";
import { SEO_SERVICE_PACKAGES } from "@/lib/service-packages-catalog";
import type { CampaignRow } from "@/lib/ensure-cfma-campaigns";

async function resolveAdminUserId(supabaseAdmin: SupabaseClient): Promise<string | null> {
  try {
    const { data: pm } = await supabaseAdmin
      .from("portal_members")
      .select("user_id")
      .eq("role", "admin")
      .limit(1)
      .maybeSingle();
    if (pm?.user_id) return pm.user_id as string;
    const { data: au } = await supabaseAdmin.from("admin_users").select("user_id").limit(1).maybeSingle();
    if (au?.user_id) return au.user_id as string;
  } catch {
    /* ignore */
  }
  return null;
}

/**
 * Ensures ticket campaigns exist for SEO monthly packages (used by transactions + Paystack).
 */
export async function ensureSeoServiceCampaign(
  supabaseAdmin: SupabaseClient,
  campaignSlug: string
): Promise<CampaignRow | null> {
  const slugNorm = campaignSlug.trim().toLowerCase();
  const tier = SEO_SERVICE_PACKAGES.find((p) => p.campaignSlug === slugNorm);
  if (!tier) return null;

  const { data: existing } = await supabaseAdmin
    .from("campaigns")
    .select("id,created_by,type,slug,title,currency,unit_amount,max_per_txn")
    .eq("slug", slugNorm)
    .maybeSingle();

  if (existing) return existing as CampaignRow;

  const adminId = await resolveAdminUserId(supabaseAdmin);
  if (!adminId) {
    console.warn("[ensureSeoServiceCampaign] No admin user — cannot auto-create campaign:", slugNorm);
    return null;
  }

  const { data: inserted, error } = await supabaseAdmin
    .from("campaigns")
    .insert({
      type: "ticket",
      slug: tier.campaignSlug,
      title: tier.title,
      description: tier.descriptionLine,
      currency: "KES",
      unit_amount: tier.amountKes,
      max_per_txn: 10,
      is_active: true,
      created_by: adminId,
    })
    .select("id,created_by,type,slug,title,currency,unit_amount,max_per_txn")
    .single();

  if (error) {
    console.error("[ensureSeoServiceCampaign] insert failed:", error);
    return null;
  }

  return inserted as CampaignRow;
}
