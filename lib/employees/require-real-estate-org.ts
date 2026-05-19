import type { SupabaseClient } from "@supabase/supabase-js";

import { isRealEstateIndustry } from "@/lib/employees/real-estate";

export async function getOrganizationIndustry(
  admin: SupabaseClient,
  userId: string
): Promise<string | null> {
  const { data, error } = await admin.auth.admin.getUserById(userId);
  if (error || !data?.user) return null;
  const meta = data.user.user_metadata as Record<string, unknown> | undefined;
  return String(meta?.organization_industry ?? meta?.organizationIndustry ?? "").trim() || null;
}

export async function assertRealEstateOrganization(
  admin: SupabaseClient,
  userId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const industry = await getOrganizationIndustry(admin, userId);
  if (!isRealEstateIndustry(industry)) {
    return {
      ok: false,
      error:
        "CRM site GPS tracking is only available for Real Estate organisations. Update your industry in account settings or contact support.",
    };
  }
  return { ok: true };
}
