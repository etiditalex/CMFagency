import type { SupabaseClient } from "@supabase/supabase-js";

export async function resolveCheckInOwner(
  admin: SupabaseClient,
  ownerId: string
): Promise<
  | { ownerId: string; venueName: string; businessEmail: string | null }
  | { error: string }
> {
  const id = ownerId.trim();
  if (!id) return { error: "Missing business check-in link." };

  const { data: member, error: pmErr } = await admin
    .from("portal_members")
    .select("user_id,role,features")
    .eq("user_id", id)
    .maybeSingle();

  if (pmErr) return { error: pmErr.message };
  if (!member) return { error: "Invalid check-in link. Business not found." };

  const role = String((member as { role?: string }).role ?? "");
  const feats = (member as { features?: unknown }).features;
  const featureList = Array.isArray(feats)
    ? feats.map((f) => String(f).toLowerCase().trim())
    : [];

  if (role !== "client" && role !== "admin" && role !== "manager") {
    return { error: "This check-in link is not active." };
  }
  if (role === "client" && !featureList.includes("visitor_management")) {
    return { error: "Visitor management is not enabled for this business." };
  }

  const { data: userData, error: userErr } = await admin.auth.admin.getUserById(id);
  if (userErr || !userData?.user) {
    return { error: "Business account not found." };
  }

  const meta = (userData.user.user_metadata ?? {}) as Record<string, unknown>;
  const venueName =
    String(meta.business_name ?? meta.organization_name ?? "").trim() || "Reception";

  return {
    ownerId: id,
    venueName,
    businessEmail: userData.user.email?.trim() ?? null,
  };
}
