import { NextRequest, NextResponse } from "next/server";
import { requireAdminOrManager } from "@/lib/fusion-require-admin";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdminOrManager(req);
    if ("error" in auth) return auth.error;
    const { admin } = auth;

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status")?.trim() || "";
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") ?? "100", 10) || 100, 1), 300);
    const offset = Math.max(parseInt(searchParams.get("offset") ?? "0", 10), 0);

    let query = admin
      .from("kcm_memberships")
      .select(
        "id,first_name,second_name,contact,email,experience,top_model_interest,payment_amount_kes,payment_confirmed,payment_status,mpesa_receipt,status,review_notes,created_at,updated_at",
        { count: "exact" }
      )
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) query = query.eq("status", status);

    const { data, error, count } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const memberships = (data ?? []) as Array<{ id: string; payment_status?: string } & Record<string, unknown>>;
    const ids = memberships.map((m) => String(m.id));
    let profileMap: Record<string, { display_name: string | null; avatar_url: string | null; bio: string | null }> = {};

    if (ids.length > 0) {
      const { data: profiles } = await admin
        .from("kcm_member_profiles")
        .select("membership_id,display_name,avatar_url,bio")
        .in("membership_id", ids);
      for (const p of (profiles ?? []) as Array<{ membership_id: string; display_name: string | null; avatar_url: string | null; bio: string | null }>) {
        profileMap[String(p.membership_id)] = {
          display_name: p.display_name ?? null,
          avatar_url: p.avatar_url ?? null,
          bio: p.bio ?? null,
        };
      }
    }

    const enriched = memberships.map((m) => ({
      ...m,
      account_status: String(m.payment_status ?? "") === "success" ? "active" : "inactive",
      profile: profileMap[String(m.id)] ?? null,
      profile_completed: !!profileMap[String(m.id)]?.display_name || !!profileMap[String(m.id)]?.avatar_url,
    }));

    return NextResponse.json({
      memberships: enriched,
      total: count ?? enriched.length,
      limit,
      offset,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
