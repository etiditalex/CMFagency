import { isVisitorIndustrySlug, type VisitorIndustrySlug } from "@/lib/visitors/industry-options";

export const REAL_ESTATE_INDUSTRY_SLUG: VisitorIndustrySlug = "real-estate";

export function isRealEstateIndustry(slug: string | null | undefined): boolean {
  if (!slug) return false;
  return slug === REAL_ESTATE_INDUSTRY_SLUG || slug === "real_estate";
}

export function memberTypeLabel(memberType: "staff" | "crm"): string {
  return memberType === "crm" ? "CRM" : "Staff";
}

export function memberTypeBadgeClass(memberType: "staff" | "crm"): string {
  return memberType === "crm"
    ? "text-violet-800 bg-violet-50 border-violet-200"
    : "text-slate-800 bg-slate-50 border-slate-200";
}
