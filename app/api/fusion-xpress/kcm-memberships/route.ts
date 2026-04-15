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
    let profileMap: Record<
      string,
      {
        display_name: string | null;
        avatar_url: string | null;
        bio: string | null;
        portfolio_text: string | null;
      }
    > = {};
    let portfolioItemCountMap: Record<string, number> = {};

    if (ids.length > 0) {
      const { data: profiles } = await admin
        .from("kcm_member_profiles")
        .select("membership_id,display_name,avatar_url,bio,portfolio_text")
        .in("membership_id", ids);
      for (const p of (profiles ?? []) as Array<{
        membership_id: string;
        display_name: string | null;
        avatar_url: string | null;
        bio: string | null;
        portfolio_text: string | null;
      }>) {
        profileMap[String(p.membership_id)] = {
          display_name: p.display_name ?? null,
          avatar_url: p.avatar_url ?? null,
          bio: p.bio ?? null,
          portfolio_text: p.portfolio_text ?? null,
        };
      }

      const { data: itemRows } = await admin
        .from("kcm_member_portfolio_items")
        .select("membership_id")
        .in("membership_id", ids);
      for (const row of itemRows ?? []) {
        const mid = String((row as { membership_id: string }).membership_id);
        portfolioItemCountMap[mid] = (portfolioItemCountMap[mid] ?? 0) + 1;
      }
    }

    const enriched = memberships.map((m) => {
      const prof = profileMap[String(m.id)] ?? null;
      const itemCount = portfolioItemCountMap[String(m.id)] ?? 0;
      return {
        ...m,
        account_status: String(m.payment_status ?? "") === "success" ? "active" : "inactive",
        profile: prof
          ? { ...prof, portfolio_item_count: itemCount }
          : itemCount > 0
            ? {
                display_name: null,
                avatar_url: null,
                bio: null,
                portfolio_text: null,
                portfolio_item_count: itemCount,
              }
            : null,
        profile_completed:
          !!prof?.display_name ||
          !!prof?.avatar_url ||
          !!prof?.portfolio_text?.trim() ||
          itemCount > 0,
      };
    });

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
