import { NextRequest, NextResponse } from "next/server";

import { requireAdminOrManager } from "@/lib/fusion-require-admin";

function parseFeatures(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((f) => String(f).toLowerCase().trim());
}

/**
 * GET: List client accounts signed up for Smart Visitor Management (admin/manager only).
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdminOrManager(req);
    if ("error" in auth) return auth.error;
    const { admin } = auth;

    const { data: members, error: pmErr } = await admin
      .from("portal_members")
      .select("user_id,role,features,created_at")
      .eq("role", "client")
      .order("created_at", { ascending: false });

    if (pmErr) return NextResponse.json({ error: pmErr.message }, { status: 500 });

    const rows = (members ?? []).filter((m) =>
      parseFeatures((m as { features?: unknown }).features).includes("visitor_management")
    );

    const { data: usersData } = await admin.auth.admin.listUsers({ perPage: 1000 });
    const usersById = new Map(
      (usersData?.users ?? []).map((u) => [u.id, u] as const)
    );

    const accounts = rows.map((m) => {
      const userId = String((m as { user_id: string }).user_id);
      const authUser = usersById.get(userId);
      const meta = (authUser?.user_metadata ?? {}) as Record<string, unknown>;
      return {
        user_id: userId,
        email: authUser?.email ?? "—",
        business_name: String(meta.business_name ?? "").trim() || "—",
        contact_name: String(meta.name ?? meta.contact_name ?? "").trim() || "—",
        organization_industry: String(meta.organization_industry ?? "").trim() || null,
        email_confirmed: Boolean(authUser?.email_confirmed_at),
        created_at: (m as { created_at?: string }).created_at ?? null,
      };
    });

    return NextResponse.json({ accounts });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
