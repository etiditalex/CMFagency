export type EventTicketCheckoutSource = {
  slug: string;
  ticket_campaign_slug?: string | null;
  ticket_price_kes?: number | null;
  ticket_tiers?: Array<{
    id?: string;
    label?: string;
    slug?: string;
    unit_amount_kes?: number;
    inclusions?: string[];
    people_per_package?: number;
  }> | null;
  free_registration?: boolean | null;
};

export type EventCheckoutTier = {
  id: string;
  label: string;
  slug: string;
  unit_amount_kes: number;
  inclusions?: string[];
  people_per_package?: number;
};

/** Campaign slug used at checkout: explicit ticket slug, otherwise the event slug. */
export function eventTicketCheckoutSlug(event: Pick<EventTicketCheckoutSource, "slug" | "ticket_campaign_slug">): string {
  return String(event.ticket_campaign_slug ?? "").trim() || String(event.slug ?? "").trim();
}

export function eventSellsTickets(event: EventTicketCheckoutSource): boolean {
  if (event.free_registration) return false;
  if ((event.ticket_tiers?.length ?? 0) > 0) return true;
  const price = Number(event.ticket_price_kes);
  if (Number.isFinite(price) && price > 0) return true;
  return Boolean(String(event.ticket_campaign_slug ?? "").trim());
}

export function generalAdmissionTiersFromEvent(event: EventTicketCheckoutSource): EventCheckoutTier[] | null {
  const slug = eventTicketCheckoutSlug(event);
  const price = Number(event.ticket_price_kes);
  if (!slug || !Number.isFinite(price) || price < 1) return null;
  return [
    {
      id: `ga-${slug}`,
      label: "General admission",
      slug,
      unit_amount_kes: Math.round(price),
    },
  ];
}

export function tiersForTicketModal(event: EventTicketCheckoutSource): EventCheckoutTier[] {
  const stored = Array.isArray(event.ticket_tiers) ? event.ticket_tiers : [];
  if (stored.length > 0) {
    const base = eventTicketCheckoutSlug(event);
    return stored.map((t, i) => {
      const label = String(t.label ?? "Ticket").trim() || "Ticket";
      const slug =
        String(t.slug ?? "").trim() ||
        `${base}-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || `tier-${i}`}`;
      return {
        id: String(t.id ?? slug),
        label,
        slug,
        unit_amount_kes: Number(t.unit_amount_kes) || 0,
        inclusions: Array.isArray(t.inclusions) ? t.inclusions : undefined,
        people_per_package: t.people_per_package,
      };
    });
  }
  return generalAdmissionTiersFromEvent(event) ?? [];
}
