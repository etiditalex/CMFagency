import type { SupabaseClient } from "@supabase/supabase-js";

export type CampaignRow = {
  id: string;
  created_by: string;
  type: string;
  slug: string;
  title: string;
  currency: string;
  unit_amount: number;
  max_per_txn: number;
};

type FusionEventRow = {
  id: string;
  slug: string;
  title: string;
  ticket_campaign_slug: string | null;
  ticket_price_kes: number | null;
  ticket_tiers: Array<{ slug?: string; label?: string; unit_amount_kes?: number }> | null;
  created_by: string | null;
};

/** Normalize to URL-safe campaign slug: lowercase, hyphens only, no leading/trailing hyphens. */
export function normalizeSlug(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "";
}

/**
 * If no campaign exists for the given slug, look up a fusion_event that uses this slug
 * (ticket_campaign_slug or a tier slug) and create the campaign from the event.
 * Returns the campaign (existing or newly created) or null.
 * Handles slugs with spaces (e.g. "old- is -gold vvip -roundtable" → "old-is-gold-vvip-roundtable").
 */
export async function ensureCampaignFromEvent(
  supabaseAdmin: SupabaseClient,
  slug: string
): Promise<CampaignRow | null> {
  const slugNorm = normalizeSlug(slug);
  if (!slugNorm) return null;

  // 1) Event with ticket_campaign_slug matching (exact or normalized)
  let event: FusionEventRow | null = null;
  let unitAmountKes = 0;
  let tierLabel = "";

  const { data: byCampaignSlug } = await supabaseAdmin
    .from("fusion_events")
    .select("id,slug,title,ticket_campaign_slug,ticket_price_kes,ticket_tiers,created_by")
    .eq("ticket_campaign_slug", slugNorm)
    .maybeSingle();
  if (byCampaignSlug) {
    event = byCampaignSlug as FusionEventRow;
    unitAmountKes = Number(event.ticket_price_kes) || 0;
  }
  if (!event) {
    const { data: withCampaignSlug } = await supabaseAdmin
      .from("fusion_events")
      .select("id,slug,title,ticket_campaign_slug,ticket_price_kes,ticket_tiers,created_by")
      .not("ticket_campaign_slug", "is", null);
    const rawList = (withCampaignSlug ?? []) as FusionEventRow[];
    const byRaw = rawList.find((e) => normalizeSlug(e.ticket_campaign_slug ?? "") === slugNorm);
    if (byRaw) {
      event = byRaw;
      unitAmountKes = Number(event.ticket_price_kes) || 0;
    }
  }

  if (!event) {
    // 2) Event with slug in ticket_tiers (match normalized so "old is gold" = "old-is-gold")
    const { data: eventsWithTiers } = await supabaseAdmin
      .from("fusion_events")
      .select("id,slug,title,ticket_campaign_slug,ticket_price_kes,ticket_tiers,created_by")
      .not("ticket_tiers", "is", null);

    const list = (eventsWithTiers ?? []) as FusionEventRow[];
    for (const e of list) {
      const tiers = Array.isArray(e.ticket_tiers) ? e.ticket_tiers : [];
      const tier = tiers.find((t) => normalizeSlug(String(t?.slug ?? "")) === slugNorm);
      if (tier != null) {
        event = e;
        unitAmountKes = Number(tier.unit_amount_kes) || Number(e.ticket_price_kes) || 0;
        tierLabel = String(tier.label ?? "").trim();
        break;
      }
    }
  } else {
    unitAmountKes = Number(event.ticket_price_kes) || 0;
  }

  if (!event) return null;

  let ownerId = event.created_by;
  if (!ownerId) {
    const { data: firstAdmin } = await supabaseAdmin
      .from("portal_members")
      .select("user_id")
      .eq("role", "admin")
      .limit(1)
      .maybeSingle();
    ownerId = (firstAdmin as { user_id?: string } | null)?.user_id ?? null;
    if (!ownerId) {
      const { data: legacyAdmin } = await supabaseAdmin.from("admin_users").select("user_id").limit(1).maybeSingle();
      ownerId = (legacyAdmin as { user_id?: string } | null)?.user_id ?? null;
    }
  }
  if (!ownerId) return null;

  const amount = Math.max(0, Math.trunc(Number(unitAmountKes)));
  if (amount <= 0) return null;

  const campaignTitle = tierLabel ? `${event.title} – ${tierLabel}` : event.title;

  const { data: inserted, error } = await supabaseAdmin
    .from("campaigns")
    .insert({
      type: "ticket",
      slug: slugNorm,
      title: campaignTitle,
      description: null,
      currency: "KES",
      unit_amount: amount,
      max_per_txn: 10,
      is_active: true,
      created_by: ownerId,
    })
    .select("id,created_by,type,slug,title,currency,unit_amount,max_per_txn")
    .single();

  if (inserted) return inserted as CampaignRow;
  if (error?.code === "23505") {
    const { data: existing } = await supabaseAdmin
      .from("campaigns")
      .select("id,created_by,type,slug,title,currency,unit_amount,max_per_txn")
      .eq("slug", slugNorm)
      .maybeSingle();
    return existing as CampaignRow | null;
  }
  return null;
}
