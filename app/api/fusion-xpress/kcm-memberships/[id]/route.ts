import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

import { buildSingleMemberXlsxBuffer, KCM_MEMBERSHIP_XLSX_MIME } from "@/lib/kcm-membership-excel";
import { requireFusionKcmMembershipAccess } from "@/lib/fusion-require-admin";

async function loadKcmMembershipExport(admin: SupabaseClient, id: string) {
  const { data: membership, error: memErr } = await admin
    .from("kcm_memberships")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (memErr || !membership) return null;

  const { data: profile } = await admin.from("kcm_member_profiles").select("*").eq("membership_id", id).maybeSingle();

  const { data: portfolio_items } = await admin
    .from("kcm_member_portfolio_items")
    .select("*")
    .eq("membership_id", id)
    .order("sort_order", { ascending: true });

  const { data: wallet_transactions } = await admin
    .from("kcm_member_wallet_transactions")
    .select("*")
    .eq("membership_id", id)
    .order("created_at", { ascending: false });

  return {
    exported_at: new Date().toISOString(),
    membership,
    profile: profile ?? null,
    portfolio_items: portfolio_items ?? [],
    wallet_transactions: wallet_transactions ?? [],
  };
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireFusionKcmMembershipAccess(req);
    if ("error" in auth) return auth.error;
    const { admin } = auth;

    const { id } = await ctx.params;
    if (!id) return NextResponse.json({ error: "Missing membership id." }, { status: 400 });

    const format = new URL(req.url).searchParams.get("format")?.trim().toLowerCase();

    const payload = await loadKcmMembershipExport(admin, id);
    if (!payload) return NextResponse.json({ error: "Membership not found." }, { status: 404 });

    if (format === "xlsx") {
      const buf = await buildSingleMemberXlsxBuffer({
        exported_at: payload.exported_at,
        membership: payload.membership as Record<string, unknown>,
        profile: payload.profile as Record<string, unknown> | null,
        portfolio_items: payload.portfolio_items as Record<string, unknown>[],
        wallet_transactions: payload.wallet_transactions as Record<string, unknown>[],
      });
      const safeId = id.replace(/[^\w-]+/g, "").slice(0, 12) || "member";
      return new NextResponse(new Uint8Array(buf), {
        headers: {
          "Content-Type": KCM_MEMBERSHIP_XLSX_MIME,
          "Content-Disposition": `attachment; filename="kcm-member-${safeId}.xlsx"`,
        },
      });
    }

    return NextResponse.json(payload);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireFusionKcmMembershipAccess(_req);
    if ("error" in auth) return auth.error;
    const { admin } = auth;

    const { id } = await ctx.params;
    if (!id) return NextResponse.json({ error: "Missing membership id." }, { status: 400 });

    const { data: existing } = await admin.from("kcm_memberships").select("id").eq("id", id).maybeSingle();
    if (!existing) return NextResponse.json({ error: "Membership not found." }, { status: 404 });

    const { error } = await admin.from("kcm_memberships").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true, deleted_id: id });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

type Body = {
  status?: "new" | "in_review" | "approved" | "rejected";
  review_notes?: string;
};

const ALLOWED_STATUSES = new Set(["new", "in_review", "approved", "rejected"]);

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireFusionKcmMembershipAccess(req);
    if ("error" in auth) return auth.error;
    const { admin } = auth;

    const { id } = await ctx.params;
    if (!id) return NextResponse.json({ error: "Missing membership id." }, { status: 400 });

    const body = (await req.json().catch(() => ({}))) as Body;
    const nextStatus = String(body.status ?? "").trim();
    const reviewNotes = String(body.review_notes ?? "").trim();

    if (!ALLOWED_STATUSES.has(nextStatus)) {
      return NextResponse.json({ error: "Invalid status." }, { status: 400 });
    }

    const { data, error } = await admin
      .from("kcm_memberships")
      .update({
        status: nextStatus,
        review_notes: reviewNotes || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select(
        "id,first_name,second_name,contact,email,experience,fashion_category,fashion_category_other,top_model_interest,payment_amount_kes,payment_confirmed,payment_status,mpesa_receipt,paid_at,status,review_notes,created_at,updated_at"
      )
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: "Membership not found." }, { status: 404 });

    const { data: profile } = await admin
      .from("kcm_member_profiles")
      .select(
        "display_name,avatar_url,cover_url,profile_category,professional_title,bio,portfolio_text,social_instagram,social_facebook,social_tiktok,social_x,updated_at"
      )
      .eq("membership_id", id)
      .maybeSingle();

    const { count: itemCount } = await admin
      .from("kcm_member_portfolio_items")
      .select("*", { count: "exact", head: true })
      .eq("membership_id", id);

    const n = itemCount ?? 0;
    const profRow = profile as {
      display_name?: string | null;
      avatar_url?: string | null;
      cover_url?: string | null;
      profile_category?: string | null;
      professional_title?: string | null;
      bio?: string | null;
      portfolio_text?: string | null;
      social_instagram?: string | null;
      social_facebook?: string | null;
      social_tiktok?: string | null;
      social_x?: string | null;
      updated_at?: string | null;
    } | null;

    const { data: walletRows } = await admin
      .from("kcm_member_wallet_transactions")
      .select("amount_kes,status,paid_at,created_at")
      .eq("membership_id", id);
    const contributions = {
      total_contributions_kes: 0,
      pending_contributions_kes: 0,
      successful_contributions_count: 0,
      last_contribution_at: null as string | null,
    };
    for (const row of (walletRows ?? []) as Array<{
      amount_kes: number;
      status: "pending" | "success" | "failed";
      paid_at: string | null;
      created_at: string;
    }>) {
      const amount = Number(row.amount_kes || 0);
      if (row.status === "success") {
        contributions.total_contributions_kes += amount;
        contributions.successful_contributions_count += 1;
        const stamp = row.paid_at ?? row.created_at;
        if (!contributions.last_contribution_at || new Date(stamp) > new Date(contributions.last_contribution_at)) {
          contributions.last_contribution_at = stamp;
        }
      } else if (row.status === "pending") {
        contributions.pending_contributions_kes += amount;
      }
    }

    const mergedProfile =
      profRow || n > 0
        ? {
            display_name: profRow?.display_name ?? null,
            avatar_url: profRow?.avatar_url ?? null,
            cover_url: profRow?.cover_url ?? null,
            profile_category: profRow?.profile_category ?? null,
            professional_title: profRow?.professional_title ?? null,
            bio: profRow?.bio ?? null,
            portfolio_text: profRow?.portfolio_text ?? null,
            social_instagram: profRow?.social_instagram ?? null,
            social_facebook: profRow?.social_facebook ?? null,
            social_tiktok: profRow?.social_tiktok ?? null,
            social_x: profRow?.social_x ?? null,
            updated_at: profRow?.updated_at ?? null,
            portfolio_item_count: n,
          }
        : null;

    return NextResponse.json({
      membership: {
        ...data,
        account_status: String((data as { payment_status?: string }).payment_status ?? "") === "success" ? "active" : "inactive",
        profile: mergedProfile,
        contributions,
        profile_completed:
          !!profRow?.display_name ||
          !!profRow?.avatar_url ||
          !!profRow?.portfolio_text?.trim() ||
          n > 0,
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
