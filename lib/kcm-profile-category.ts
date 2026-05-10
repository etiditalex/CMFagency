/** Values allowed in `kcm_member_profiles.profile_category` (registration + legacy portal). */
export const KCM_PROFILE_CATEGORIES = [
  "model",
  "event_organizer",
  "designer",
  "other",
  "high_fashion_model",
  "pageant_model",
] as const;

export type KcmProfileCategory = (typeof KCM_PROFILE_CATEGORIES)[number];

const ALLOWED = new Set<string>(KCM_PROFILE_CATEGORIES);

/** Map registration `kcm_memberships.fashion_category` → profile_category (same slug). */
export function fashionCategoryToProfileCategory(
  fashion: string | null | undefined
): KcmProfileCategory {
  const s = String(fashion ?? "").trim().toLowerCase();
  if (s === "model") return "model";
  if (s === "event_organizer") return "event_organizer";
  if (s === "designer") return "designer";
  if (s === "other") return "other";
  return "model";
}

export function normalizeKcmProfileCategory(raw: string | null | undefined): KcmProfileCategory {
  const s = String(raw ?? "").trim().toLowerCase();
  if (ALLOWED.has(s)) return s as KcmProfileCategory;
  // Legacy values before registration-aligned categories
  if (s === "creative") return "high_fashion_model";
  return "model";
}

/** Prefer stored profile category; if missing, derive from membership registration fashion. */
export function profileCategoryOrFromFashion(
  existing: string | null | undefined,
  membershipFashion: string | null | undefined
): KcmProfileCategory {
  const ex = existing != null ? String(existing).trim() : "";
  if (ex !== "") {
    return normalizeKcmProfileCategory(existing);
  }
  return fashionCategoryToProfileCategory(membershipFashion);
}

/**
 * Member/admin UI: when registration chose "other", show the member's written category
 * (`fashion_category_other`), falling back to profile professional title if needed (legacy).
 */
export function portalFashionCategoryDisplay(opts: {
  profileCategory: string | null | undefined;
  membershipFashion: string | null | undefined;
  fashionCategoryOther: string | null | undefined;
  professionalTitle: string | null | undefined;
}): string {
  const fc = String(opts.membershipFashion ?? "").trim().toLowerCase();
  const resolved = profileCategoryOrFromFashion(opts.profileCategory, opts.membershipFashion);
  const isOther = resolved === "other" || fc === "other";
  if (isOther) {
    const fromRegistration = String(opts.fashionCategoryOther ?? "").trim();
    if (fromRegistration) return fromRegistration;
    const fromProfile = String(opts.professionalTitle ?? "").trim();
    if (fromProfile) return fromProfile;
  }
  return labelForKcmProfileCategory(resolved);
}

export function labelForKcmProfileCategory(cat: string | null | undefined): string {
  const s = String(cat ?? "").trim().toLowerCase();
  switch (s) {
    case "model":
      return "Model";
    case "event_organizer":
      return "Event organizer";
    case "designer":
      return "Designer";
    case "other":
      return "Other";
    case "high_fashion_model":
      return "High fashion model";
    case "pageant_model":
      return "Pageant model";
    default:
      return "Model";
  }
}
