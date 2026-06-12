import { isVisitorIndustrySlug, type VisitorIndustrySlug } from "@/lib/visitors/industry-options";

export const RETAIL_HOSPITALITY_INDUSTRY_SLUG: VisitorIndustrySlug = "retail-hospitality";

export function isRetailHospitalityIndustry(slug: string | null | undefined): boolean {
  if (!slug) return false;
  if (slug === RETAIL_HOSPITALITY_INDUSTRY_SLUG || slug === "retail_hospitality") return true;
  return isVisitorIndustrySlug(slug) && slug === RETAIL_HOSPITALITY_INDUSTRY_SLUG;
}
