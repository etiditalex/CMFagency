import type { SupabaseClient } from "@supabase/supabase-js";

/** CFMA 2026 ticket tiers - used when campaigns don't exist (Buy Ticket Online from upcoming events) */
const CFMA_TIERS: Record<
  string,
  { slug: string; title: string; description: string; unit_amount: number }
> = {
  "cfma-2026": {
    slug: "cfma-2026",
    title: "CFMA 2026 - Early Bird Regular",
    description: "Coast Fashion and Modelling Awards 2026 - Regular ticket. 15th August 2026, Mombasa.",
    unit_amount: 500,
  },
  "cfma-2026-vip": {
    slug: "cfma-2026-vip",
    title: "CFMA 2026 - Early Bird VIP",
    description: "Coast Fashion and Modelling Awards 2026 - VIP ticket. 15th August 2026, Mombasa.",
    unit_amount: 1500,
  },
  "cfma-2026-vvip": {
    slug: "cfma-2026-vvip",
    title: "CFMA 2026 - Early Bird VVIP",
    description: "Coast Fashion and Modelling Awards 2026 - VVIP ticket. 15th August 2026, Mombasa.",
    unit_amount: 3500,
  },
};

const CFMA_SLUGS = new Set(Object.keys(CFMA_TIERS));

export function isCfmaTicketSlug(slug: string): boolean {
  return CFMA_SLUGS.has(slug.trim().toLowerCase());
}

export type CampaignRow = {
  id: string;
  created_by: string;
  type: "ticket" | "vote";
  slug: string;
  title: string;
  currency: string;
  unit_amount: number;
  max_per_txn: number;
};

/**
 * Ensures CFMA ticket campaign exists. If not found and slug is a known CFMA tier,
 * creates it using the first admin as owner. Use with service-role Supabase client.
 */
export async function ensureCfmaCampaign(
  supabaseAdmin: SupabaseClient,
  slug: string
): Promise<CampaignRow | null> {
  const slugNorm = slug.trim().toLowerCase();
  if (!CFMA_SLUGS.has(slugNorm)) return null;

  const { data: existing } = await supabaseAdmin
    .from("campaigns")
    .select("id,created_by,type,slug,title,currency,unit_amount,max_per_txn")
    .eq("slug", slugNorm)
    .maybeSingle();

  if (existing) return existing as CampaignRow;

  const tier = CFMA_TIERS[slugNorm];
  if (!tier) return null;

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
    console.warn("ensureCfmaCampaign: could not fetch admin", e);
  }

  if (!adminId) {
    console.warn("ensureCfmaCampaign: No admin user found. Run ticketing_voting_mvp_seed_cfma_campaigns.sql");
    return null;
  }

  const { data: inserted, error } = await supabaseAdmin
    .from("campaigns")
    .insert({
      type: "ticket",
      slug: tier.slug,
      title: tier.title,
      description: tier.description,
      currency: "KES",
      unit_amount: tier.unit_amount,
      max_per_txn: 10,
      is_active: true,
      created_by: adminId,
    })
    .select("id,created_by,type,slug,title,currency,unit_amount,max_per_txn")
    .single();

  if (error) {
    console.error("ensureCfmaCampaign: insert failed", error);
    return null;
  }

  return inserted as CampaignRow;
}

const CERTIFICATE_SUPPORT_SLUG = "certificate-support";

/**
 * Ensures the optional certificate support payment campaign exists (200 KES).
 * Used when contestant optionally pays to support the agency on certificate request.
 */
export async function ensureCertificateSupportCampaign(
  supabaseAdmin: SupabaseClient
): Promise<CampaignRow | null> {
  const { data: existing } = await supabaseAdmin
    .from("campaigns")
    .select("id,created_by,type,slug,title,currency,unit_amount,max_per_txn")
    .eq("slug", CERTIFICATE_SUPPORT_SLUG)
    .maybeSingle();

  if (existing) return existing as CampaignRow;

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
    console.warn("ensureCertificateSupportCampaign: could not fetch admin", e);
  }

  if (!adminId) return null;

  const { data: inserted, error } = await supabaseAdmin
    .from("campaigns")
    .insert({
      type: "ticket",
      slug: CERTIFICATE_SUPPORT_SLUG,
      title: "Certificate of Participation – Optional Support",
      description: "Optional 200 KES to support our work when requesting your participation certificate.",
      currency: "KES",
      unit_amount: 200,
      max_per_txn: 1,
      is_active: true,
      created_by: adminId,
    })
    .select("id,created_by,type,slug,title,currency,unit_amount,max_per_txn")
    .single();

  if (error) {
    console.error("ensureCertificateSupportCampaign: insert failed", error);
    return null;
  }

  return inserted as CampaignRow;
}

const MERCHANDISE_SLUG = "merchandise";

/**
 * Ensures the merchandise campaign exists (for cart checkout).
 * If not found, creates it using the first admin. Use with service-role client.
 */
export async function ensureMerchandiseCampaign(
  supabaseAdmin: SupabaseClient
): Promise<CampaignRow | null> {
  const { data: existing } = await supabaseAdmin
    .from("campaigns")
    .select("id,type,slug,title,currency,unit_amount,max_per_txn")
    .eq("slug", MERCHANDISE_SLUG)
    .maybeSingle();

  if (existing) return existing as CampaignRow;

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
    console.warn("ensureMerchandiseCampaign: could not fetch admin", e);
  }

  if (!adminId) {
    console.warn("ensureMerchandiseCampaign: No admin found. Add an admin in Fusion Xpress or run patch_12.");
    return null;
  }

  const { data: inserted, error } = await supabaseAdmin
    .from("campaigns")
    .insert({
      type: "ticket",
      slug: MERCHANDISE_SLUG,
      title: "Changer Fusions Merchandise",
      description: "Branded merchandise - T-shirts, hoodies, water bottles, key holders.",
      currency: "KES",
      unit_amount: 1,
      max_per_txn: 1000000,
      is_active: true,
      created_by: adminId,
    })
    .select("id,type,slug,title,currency,unit_amount,max_per_txn")
    .single();

  if (error) {
    console.error("ensureMerchandiseCampaign: insert failed", error);
    return null;
  }

  return inserted as CampaignRow;
}
