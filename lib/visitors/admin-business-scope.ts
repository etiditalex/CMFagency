import type { SupabaseClient } from "@supabase/supabase-js";

import { organizationIndustryFromMetadata } from "@/lib/employees/require-real-estate-org";

export type VisitorBusinessAccount = {
  userId: string;
  businessName: string;
  email: string;
  industry: string | null;
};

function parseFeatures(raw: unknown): string[] {
  return Array.isArray(raw) ? raw.map((f) => String(f).toLowerCase().trim()) : [];
}

/** Client accounts with Smart Visitor Management (for admin business picker). */
export async function listVisitorBusinessAccounts(
  admin: SupabaseClient
): Promise<VisitorBusinessAccount[]> {
  const { data: members, error } = await admin
    .from("portal_members")
    .select("user_id,role,features,created_at")
    .eq("role", "client")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  const rows = (members ?? []).filter((m) =>
    parseFeatures((m as { features?: unknown }).features).includes("visitor_management")
  );

  const { data: usersData } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const usersById = new Map((usersData?.users ?? []).map((u) => [u.id, u] as const));

  return rows.map((m) => {
    const userId = String((m as { user_id: string }).user_id);
    const authUser = usersById.get(userId);
    const meta = (authUser?.user_metadata ?? {}) as Record<string, unknown>;
    return {
      userId,
      businessName: String(meta.business_name ?? meta.businessName ?? "").trim() || authUser?.email || "Business",
      email: authUser?.email ?? "",
      industry: organizationIndustryFromMetadata(meta),
    };
  });
}

export async function isVisitorManagementClient(
  admin: SupabaseClient,
  ownerId: string
): Promise<boolean> {
  const { data } = await admin
    .from("portal_members")
    .select("user_id,role,features")
    .eq("user_id", ownerId)
    .maybeSingle();
  if (!data) return false;
  const role = String(data.role ?? "").toLowerCase();
  if (role !== "client") return false;
  return parseFeatures(data.features).includes("visitor_management");
}

export type AdminOwnerScope =
  | { ok: true; ownerId: string; isAdminScoped: boolean }
  | { ok: false; code: "missing_owner"; message: string }
  | { ok: false; code: "invalid_owner"; message: string };

/**
 * Business users always scope to self. Admins must pass a valid ownerId query param.
 */
export async function resolveAdminOwnerScope(
  admin: SupabaseClient,
  isAdmin: boolean,
  callerUserId: string,
  ownerIdParam: string | null | undefined
): Promise<AdminOwnerScope> {
  if (!isAdmin) {
    return { ok: true, ownerId: callerUserId, isAdminScoped: false };
  }

  const ownerId = String(ownerIdParam ?? "").trim();
  if (!ownerId) {
    return {
      ok: false,
      code: "missing_owner",
      message: "Select a business to view its activity.",
    };
  }

  if (!(await isVisitorManagementClient(admin, ownerId))) {
    return { ok: false, code: "invalid_owner", message: "Business not found." };
  }

  return { ok: true, ownerId, isAdminScoped: true };
}

export async function getOrganizationIndustryForUser(
  admin: SupabaseClient,
  userId: string
): Promise<string | null> {
  const { data, error } = await admin.auth.admin.getUserById(userId);
  if (error || !data?.user) return null;
  return organizationIndustryFromMetadata(
    data.user.user_metadata as Record<string, unknown> | undefined
  );
}
