/**
 * Ticket tier objects stored in fusion_events.ticket_tiers (jsonb array).
 */

export type FusionTicketTier = {
  id: string;
  label: string;
  slug: string;
  unit_amount_kes: number;
  inclusions?: string[];
  /** People covered by one purchase (e.g. 4 for a VVIP round table). Defaults to 1. */
  people_per_package?: number;
};

export function normalizePeoplePerPackage(raw: unknown): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(500, Math.floor(n));
}

export function normalizeTierFromDb(row: Partial<FusionTicketTier> & Record<string, unknown>): FusionTicketTier {
  return {
    id: String(row.id ?? ""),
    label: String(row.label ?? ""),
    slug: String(row.slug ?? ""),
    unit_amount_kes: Number(row.unit_amount_kes) || 0,
    inclusions: Array.isArray(row.inclusions) ? (row.inclusions as string[]).filter(Boolean) : [],
    people_per_package: normalizePeoplePerPackage(row.people_per_package),
  };
}

export function tierToStoredJson(t: FusionTicketTier): Record<string, unknown> {
  const p = normalizePeoplePerPackage(t.people_per_package);
  const out: Record<string, unknown> = {
    id: t.id,
    label: t.label,
    slug: t.slug,
    unit_amount_kes: t.unit_amount_kes,
  };
  if (Array.isArray(t.inclusions) && t.inclusions.length > 0) {
    out.inclusions = t.inclusions;
  }
  if (p > 1) {
    out.people_per_package = p;
  }
  return out;
}
