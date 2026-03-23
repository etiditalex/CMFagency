/** Shared industry / seniority options for job board filters and dashboard (slug → label). */

export const JOB_SENIORITY_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "Seniority" },
  { value: "entry_basic", label: "Entry or Basic level" },
  { value: "mid", label: "Mid-level" },
  { value: "senior", label: "Senior-level" },
];

export const JOB_INDUSTRY_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "Industry" },
  { value: "agriculture_fishing_forestry", label: "Agriculture, fishing, forestry" },
  { value: "automotive", label: "Automotive" },
  { value: "banking_microfinance_insurance", label: "Banking, microfinance, insurance" },
  { value: "beauty_cosmetic", label: "Beauty, cosmetic" },
  { value: "communications_media_radio_tv", label: "Communications, media, radio, TV" },
  { value: "computers_software_development_services", label: "Computers, software development and services" },
  { value: "construction_renovation_maintenance", label: "Construction, renovation, maintenance" },
  { value: "consulting_business_support_auditing", label: "Consulting, business support, auditing" },
  { value: "data_research", label: "Data / research" },
  { value: "education_academic", label: "Education, academic" },
  { value: "electronic", label: "Electronic" },
  { value: "energy_utilities_environment", label: "Energy, utilities, environment" },
  { value: "engineering_architecture", label: "Engineering, architecture" },
  { value: "entertainment_events", label: "Entertainment, events" },
  { value: "finance_fintech", label: "Finance and fintech" },
  { value: "financial_services", label: "Financial services" },
  { value: "governmental", label: "Governmental" },
  { value: "healthcare_medical", label: "Healthcare, medical" },
  { value: "housekeeping_maintenance", label: "Housekeeping, maintenance" },
  {
    value: "human_resources_talent_development_recruitment",
    label: "Human resources, talent development, recruitment",
  },
  { value: "legal_accounting", label: "Legal, accounting" },
  { value: "manufacturing", label: "Manufacturing" },
  { value: "marketing", label: "Marketing" },
  { value: "nonprofit_social_work", label: "Non-profit, social work" },
  { value: "outsourcing_leasing", label: "Outsourcing, leasing" },
  { value: "real_estate", label: "Real estate" },
  { value: "restaurant_hospitality_travel", label: "Restaurant, hospitality, travel" },
  { value: "retail_wholesale_fmcg", label: "Retail, wholesale, FMCG" },
  { value: "security", label: "Security" },
  { value: "telecommunications", label: "Telecommunications" },
  { value: "textile_fashion", label: "Textile, fashion" },
  { value: "transportation_logistics_storage", label: "Transportation, logistics, storage" },
];

const SENIORITY_SLUGS = new Set(JOB_SENIORITY_OPTIONS.map((o) => o.value).filter(Boolean));
const INDUSTRY_SLUGS = new Set(JOB_INDUSTRY_OPTIONS.map((o) => o.value).filter(Boolean));

const seniorityLabelBySlug = new Map(JOB_SENIORITY_OPTIONS.filter((o) => o.value).map((o) => [o.value, o.label]));
const industryLabelBySlug = new Map(JOB_INDUSTRY_OPTIONS.filter((o) => o.value).map((o) => [o.value, o.label]));

export function isValidSenioritySlug(slug: string): boolean {
  return SENIORITY_SLUGS.has(slug);
}

export function isValidIndustrySlug(slug: string): boolean {
  return INDUSTRY_SLUGS.has(slug);
}

export function seniorityLabel(slug: string | null | undefined): string | null {
  if (slug == null || slug === "") return null;
  return seniorityLabelBySlug.get(slug) ?? null;
}

export function industryLabel(slug: string | null | undefined): string | null {
  if (slug == null || slug === "") return null;
  return industryLabelBySlug.get(slug) ?? null;
}

/** Not in body → undefined (do not change). In body as null/"" → null (clear). Invalid slug → "invalid". */
export function readIndustryFromBody(body: Record<string, unknown>): string | null | undefined | "invalid" {
  if (!("industry" in body)) return undefined;
  const raw = body.industry;
  if (raw === null || raw === "") return null;
  const s = String(raw).trim();
  if (!s) return null;
  return isValidIndustrySlug(s) ? s : "invalid";
}

export function readSeniorityFromBody(body: Record<string, unknown>): string | null | undefined | "invalid" {
  if (!("seniority" in body)) return undefined;
  const raw = body.seniority;
  if (raw === null || raw === "") return null;
  const s = String(raw).trim();
  if (!s) return null;
  return isValidSenioritySlug(s) ? s : "invalid";
}
