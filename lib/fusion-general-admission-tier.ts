import { isKenyaShillingsForLipa } from "@/lib/lipa-pole-pole";

export type FusionModalTicketTier = {
  id: string;
  label: string;
  slug: string;
  unit_amount_kes: number;
};

/**
 * Build a single tier for `CmfAwardsTicketModal` from Fusion Xpress “general” ticket
 * (`ticket_campaign_slug` without `ticket_tiers`). Uses event price when set; otherwise
 * loads the public campaign so price/currency match the checkout page.
 */
export async function resolveFusionModalTicketTier(
  ticketCampaignSlug: string | null | undefined,
  ticketPriceKes?: number | null
): Promise<FusionModalTicketTier | "navigate"> {
  const slug = String(ticketCampaignSlug ?? "").trim();
  if (!slug) return "navigate";

  const priceRaw = ticketPriceKes != null ? Number(ticketPriceKes) : NaN;
  if (Number.isFinite(priceRaw) && priceRaw > 0) {
    return {
      id: `ga-${slug}`,
      label: "General admission",
      slug,
      unit_amount_kes: Math.round(priceRaw),
    };
  }

  const res = await fetch(`/api/campaigns/${encodeURIComponent(slug)}/page-data`);
  let body: {
    not_found?: boolean;
    campaign?: { type: string; slug: string; unit_amount: number; currency?: string | null };
  } = {};
  try {
    body = await res.json();
  } catch {
    return "navigate";
  }
  if (!res.ok || body.not_found || !body.campaign) return "navigate";
  const c = body.campaign;
  if (c.type !== "ticket") return "navigate";
  if (!isKenyaShillingsForLipa(c.currency)) return "navigate";
  const ua = Math.round(Number(c.unit_amount));
  if (!Number.isFinite(ua) || ua < 1) return "navigate";
  return {
    id: `ga-${c.slug}`,
    label: "Ticket",
    slug: c.slug,
    unit_amount_kes: ua,
  };
}
