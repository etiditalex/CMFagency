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

export type CampaignRow = {
  id: string;
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
    .select("id,type,slug,title,currency,unit_amount,max_per_txn")
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
    .select("id,type,slug,title,currency,unit_amount,max_per_txn")
    .single();

  if (error) {
    console.error("ensureCfmaCampaign: insert failed", error);
    return null;
  }

  return inserted as CampaignRow;
}
