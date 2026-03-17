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

/**
 * If no campaign exists for the given slug, look up a fusion_event that uses this slug
 * (ticket_campaign_slug or a tier slug) and create the campaign from the event.
 * Returns the campaign (existing or newly created) or null.
 */
export async function ensureCampaignFromEvent(
  supabaseAdmin: SupabaseClient,
  slug: string
): Promise<CampaignRow | null> {
  const slugNorm = slug.trim().toLowerCase();
  if (!slugNorm) return null;

  // 1) Event with ticket_campaign_slug = slug
  const { data: byCampaignSlug } = await supabaseAdmin
    .from("fusion_events")
    .select("id,slug,title,ticket_campaign_slug,ticket_price_kes,ticket_tiers,created_by")
    .eq("ticket_campaign_slug", slugNorm)
    .maybeSingle();

  let event = byCampaignSlug as FusionEventRow | null;
  let unitAmountKes = event?.ticket_price_kes ?? 0;
  let tierLabel = "";

  if (!event) {
    // 2) Event with slug in ticket_tiers
    const { data: eventsWithTiers } = await supabaseAdmin
      .from("fusion_events")
      .select("id,slug,title,ticket_campaign_slug,ticket_price_kes,ticket_tiers,created_by")
      .not("ticket_tiers", "is", null);

    const list = (eventsWithTiers ?? []) as FusionEventRow[];
    for (const e of list) {
      const tiers = Array.isArray(e.ticket_tiers) ? e.ticket_tiers : [];
      const tier = tiers.find((t) => String(t?.slug ?? "").toLowerCase() === slugNorm);
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

  const ownerId = event.created_by;
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
