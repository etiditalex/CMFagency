import type { SupabaseClient } from "@supabase/supabase-js";

import { isRealEstateIndustry } from "@/lib/employees/real-estate";

export const REAL_ESTATE_ONLY_FEATURE_MESSAGE =
  "CRM features are only available for Real Estate organisations.";

/** Industry slug stored on the portal account (registration / account settings). */
export function organizationIndustryFromMetadata(
  meta: Record<string, unknown> | null | undefined
): string | null {
  const slug = String(
    meta?.organization_industry ??
      meta?.organizationIndustry ??
      meta?.industry ??
      meta?.business_industry ??
      ""
  ).trim();
  return slug || null;
}

export async function getOrganizationIndustry(
  admin: SupabaseClient,
  userId: string
): Promise<string | null> {
  const { data, error } = await admin.auth.admin.getUserById(userId);
  if (error || !data?.user) return null;
  return organizationIndustryFromMetadata(
    data.user.user_metadata as Record<string, unknown> | undefined
  );
}

export async function assertRealEstateOrganization(
  admin: SupabaseClient,
  userId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const industry = await getOrganizationIndustry(admin, userId);
  if (!isRealEstateIndustry(industry)) {
    return {
      ok: false,
      error: REAL_ESTATE_ONLY_FEATURE_MESSAGE,
    };
  }
  return { ok: true };
}

/** For admins viewing a selected business — checks that business's industry. */
export async function assertRealEstateOrganizationForOwner(
  admin: SupabaseClient,
  ownerUserId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  return assertRealEstateOrganization(admin, ownerUserId);
}
