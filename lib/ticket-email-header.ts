/**
 * Ticket email header colors by tier:
 * Complimentary → red, Regular (incl. group) → green, VIP → blue, VVIP → gold.
 */
export type TicketEmailTier = "complimentary" | "regular" | "vip" | "vvip";

const TIER_HEADER_STYLES: Record<TicketEmailTier, { background: string }> = {
  complimentary: { background: "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)" },
  regular: { background: "linear-gradient(135deg, #059669 0%, #047857 100%)" },
  vip: { background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)" },
  vvip: { background: "linear-gradient(135deg, #D4AF37 0%, #B8860B 100%)" },
};

const TIER_ACCENT_COLORS: Record<TicketEmailTier, string> = {
  complimentary: "#dc2626",
  regular: "#059669",
  vip: "#2563eb",
  vvip: "#B8860B",
};

export function resolveTicketEmailTier(input: {
  reference?: string;
  campaignSlug?: string;
  campaignTitle?: string;
}): TicketEmailTier {
  if (input.reference?.startsWith("cmfa_reg_")) return "complimentary";

  const haystack = `${input.campaignSlug ?? ""} ${input.campaignTitle ?? ""}`.toLowerCase();

  if (haystack.includes("vvip")) return "vvip";
  if (/\bvip\b/.test(haystack) || haystack.includes("-vip") || haystack.endsWith("vip")) return "vip";

  return "regular";
}

export function ticketEmailHeaderStyle(tier: TicketEmailTier): { background: string } {
  return TIER_HEADER_STYLES[tier];
}

export function ticketEmailAccentColor(tier: TicketEmailTier): string {
  return TIER_ACCENT_COLORS[tier];
}
