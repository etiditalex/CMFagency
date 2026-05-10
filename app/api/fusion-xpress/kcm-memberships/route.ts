import { NextRequest, NextResponse } from "next/server";

import { buildAllMembersXlsxBuffer, KCM_MEMBERSHIP_XLSX_MIME } from "@/lib/kcm-membership-excel";
import { requireFusionKcmMembershipAccess } from "@/lib/fusion-require-admin";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireFusionKcmMembershipAccess(req);
    if ("error" in auth) return auth.error;
    const { admin } = auth;

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status")?.trim() || "";
    const format = searchParams.get("format")?.trim().toLowerCase() ?? "";
    const defaultCap = format === "xlsx" ? 5000 : 300;
    const limit = Math.min(
      Math.max(parseInt(searchParams.get("limit") ?? (format === "xlsx" ? "5000" : "100"), 10) || (format === "xlsx" ? 5000 : 100), 1),
      defaultCap
    );
    const offset = Math.max(parseInt(searchParams.get("offset") ?? "0", 10), 0);

    let query = admin
      .from("kcm_memberships")
      .select(
        "id,first_name,second_name,contact,email,experience,fashion_category,fashion_category_other,top_model_interest,payment_amount_kes,payment_confirmed,payment_status,mpesa_receipt,paid_at,status,review_notes,created_at,updated_at",
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
        cover_url: string | null;
        profile_category: string | null;
        professional_title: string | null;
        bio: string | null;
        portfolio_text: string | null;
        social_instagram: string | null;
        social_facebook: string | null;
        social_tiktok: string | null;
        social_x: string | null;
        updated_at: string | null;
      }
    > = {};
    let portfolioItemCountMap: Record<string, number> = {};
    let walletMap: Record<
      string,
      {
        total_contributions_kes: number;
        pending_contributions_kes: number;
        successful_contributions_count: number;
        last_contribution_at: string | null;
      }
    > = {};

    if (ids.length > 0) {
      const [{ data: profiles }, { data: itemRows }, { data: walletRows }] = await Promise.all([
        admin
          .from("kcm_member_profiles")
          .select(
            "membership_id,display_name,avatar_url,cover_url,profile_category,professional_title,bio,portfolio_text,social_instagram,social_facebook,social_tiktok,social_x,updated_at"
          )
          .in("membership_id", ids),
        admin.from("kcm_member_portfolio_items").select("membership_id").in("membership_id", ids),
        admin
          .from("kcm_member_wallet_transactions")
          .select("membership_id,amount_kes,status,paid_at,created_at")
          .in("membership_id", ids),
      ]);

      for (const p of (profiles ?? []) as Array<{
        membership_id: string;
        display_name: string | null;
        avatar_url: string | null;
        cover_url: string | null;
        profile_category: string | null;
        professional_title: string | null;
        bio: string | null;
        portfolio_text: string | null;
        social_instagram: string | null;
        social_facebook: string | null;
        social_tiktok: string | null;
        social_x: string | null;
        updated_at: string | null;
      }>) {
        profileMap[String(p.membership_id)] = {
          display_name: p.display_name ?? null,
          avatar_url: p.avatar_url ?? null,
          cover_url: p.cover_url ?? null,
          profile_category: p.profile_category ?? null,
          professional_title: p.professional_title ?? null,
          bio: p.bio ?? null,
          portfolio_text: p.portfolio_text ?? null,
          social_instagram: p.social_instagram ?? null,
          social_facebook: p.social_facebook ?? null,
          social_tiktok: p.social_tiktok ?? null,
          social_x: p.social_x ?? null,
          updated_at: p.updated_at ?? null,
        };
      }

      for (const row of itemRows ?? []) {
        const mid = String((row as { membership_id: string }).membership_id);
        portfolioItemCountMap[mid] = (portfolioItemCountMap[mid] ?? 0) + 1;
      }

      for (const row of (walletRows ?? []) as Array<{
        membership_id: string;
        amount_kes: number;
        status: "pending" | "success" | "failed";
        paid_at: string | null;
        created_at: string;
      }>) {
        const mid = String(row.membership_id);
        const current = walletMap[mid] ?? {
          total_contributions_kes: 0,
          pending_contributions_kes: 0,
          successful_contributions_count: 0,
          last_contribution_at: null,
        };
        const amount = Number(row.amount_kes || 0);
        if (row.status === "success") {
          current.total_contributions_kes += amount;
          current.successful_contributions_count += 1;
          const stamp = row.paid_at ?? row.created_at;
          if (!current.last_contribution_at || new Date(stamp) > new Date(current.last_contribution_at)) {
            current.last_contribution_at = stamp;
          }
        } else if (row.status === "pending") {
          current.pending_contributions_kes += amount;
        }
        walletMap[mid] = current;
      }
    }

    const enriched = memberships.map((m) => {
      const prof = profileMap[String(m.id)] ?? null;
      const itemCount = portfolioItemCountMap[String(m.id)] ?? 0;
      const wallet = walletMap[String(m.id)] ?? {
        total_contributions_kes: 0,
        pending_contributions_kes: 0,
        successful_contributions_count: 0,
        last_contribution_at: null,
      };
      return {
        ...m,
        account_status: String(m.payment_status ?? "") === "success" ? "active" : "inactive",
        profile: prof
          ? { ...prof, portfolio_item_count: itemCount }
          : itemCount > 0
            ? {
                display_name: null,
                avatar_url: null,
                cover_url: null,
                profile_category: null,
                professional_title: null,
                bio: null,
                portfolio_text: null,
                social_instagram: null,
                social_facebook: null,
                social_tiktok: null,
                social_x: null,
                updated_at: null,
                portfolio_item_count: itemCount,
              }
            : null,
        contributions: wallet,
        profile_completed:
          !!prof?.display_name ||
          !!prof?.avatar_url ||
          !!prof?.portfolio_text?.trim() ||
          itemCount > 0,
      };
    });

    if (format === "xlsx") {
      const buf = await buildAllMembersXlsxBuffer(enriched as Record<string, unknown>[]);
      const stamp = new Date().toISOString().slice(0, 10);
      return new NextResponse(new Uint8Array(buf), {
        headers: {
          "Content-Type": KCM_MEMBERSHIP_XLSX_MIME,
          "Content-Disposition": `attachment; filename="kcm-members-export-${stamp}.xlsx"`,
        },
      });
    }

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
