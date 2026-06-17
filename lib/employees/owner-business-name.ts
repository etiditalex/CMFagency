import type { SupabaseClient } from "@supabase/supabase-js";

export async function resolveOwnerBusinessName(
  admin: SupabaseClient,
  ownerId: string
): Promise<string> {
  const { data: ownerRes } = await admin.auth.admin.getUserById(ownerId);
  const meta = (ownerRes?.user?.user_metadata ?? {}) as Record<string, unknown>;
  return (
    String(meta.business_name ?? meta.businessName ?? "").trim() || "Your organisation"
  );
}
