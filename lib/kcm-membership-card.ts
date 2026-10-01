import { fashionCategoryToProfileCategory, labelForKcmProfileCategory } from "@/lib/kcm-profile-category";

export type KcmMembershipCardData = {
  membershipNumber: string;
  fullName: string;
  category: string;
  contact: string;
  email: string;
  issuedOn: string;
};

export function kcmCardCodeFromNumber(membershipNumber: string): string {
  return membershipNumber.trim().toUpperCase().replace(/\//g, "-");
}

export function kcmMembershipNumberFromCardCode(code: string): string {
  return decodeURIComponent(code)
    .trim()
    .toUpperCase()
    .replace(/-/g, "/")
    .replace(/\/+/g, "/");
}

export function kcmMembershipCardPath(membershipNumber: string): string {
  return `/kcm/membership-card/${encodeURIComponent(kcmCardCodeFromNumber(membershipNumber))}`;
}

export function kcmMembershipCategoryLabel(
  fashionCategory: string | null | undefined,
  fashionCategoryOther: string | null | undefined
): string {
  const fc = String(fashionCategory ?? "").trim().toLowerCase();
  if (fc === "other") {
    const custom = String(fashionCategoryOther ?? "").trim();
    if (custom) return custom;
  }
  return labelForKcmProfileCategory(fashionCategoryToProfileCategory(fashionCategory));
}

export function formatKcmIssuedDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Nairobi",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}
