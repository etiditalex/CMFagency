/** Dashboard / marketing industry order (matches Smart Visitor Management page). */
export const VISITOR_INDUSTRIES = [
  { slug: "retail-hospitality", label: "Retail & Hospitality" },
  { slug: "health-aged-care", label: "Health & Aged Care" },
  { slug: "real-estate", label: "Real Estate" },
  { slug: "office-education", label: "Office & Education" },
  { slug: "sports", label: "Sports" },
  { slug: "tourism", label: "Tourism" },
] as const;

export type VisitorIndustrySlug = (typeof VISITOR_INDUSTRIES)[number]["slug"];

export function industryLabel(slug: string | null | undefined): string {
  if (!slug) return "—";
  return VISITOR_INDUSTRIES.find((i) => i.slug === slug)?.label ?? slug;
}

export function isVisitorIndustrySlug(slug: string): slug is VisitorIndustrySlug {
  return VISITOR_INDUSTRIES.some((i) => i.slug === slug);
}

export const VISITOR_MANAGEMENT_PATH = "/dashboard/visitor-management";

export function visitorManagementHref(industrySlug?: string | null): string {
  if (!industrySlug || industrySlug === "all") return VISITOR_MANAGEMENT_PATH;
  return `${VISITOR_MANAGEMENT_PATH}?industry=${encodeURIComponent(industrySlug)}`;
}

export const VISITOR_MANAGEMENT_NAV_CHILDREN = [
  { label: "All industries", industrySlug: "all" as const },
  ...VISITOR_INDUSTRIES.map((i) => ({ label: i.label, industrySlug: i.slug })),
];
