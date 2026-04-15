import { NextRequest, NextResponse } from "next/server";
import { requireAdminOrManager } from "@/lib/fusion-require-admin";

type Body = {
  status?: "new" | "in_review" | "approved" | "rejected";
  review_notes?: string;
};

const ALLOWED_STATUSES = new Set(["new", "in_review", "approved", "rejected"]);

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdminOrManager(req);
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
        "id,first_name,second_name,contact,email,experience,top_model_interest,payment_amount_kes,payment_confirmed,payment_status,mpesa_receipt,status,review_notes,created_at,updated_at"
      )
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: "Membership not found." }, { status: 404 });

    const { data: profile } = await admin
      .from("kcm_member_profiles")
      .select("display_name,avatar_url,bio,portfolio_text")
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
      bio?: string | null;
      portfolio_text?: string | null;
    } | null;

    const mergedProfile =
      profRow || n > 0
        ? {
            display_name: profRow?.display_name ?? null,
            avatar_url: profRow?.avatar_url ?? null,
            bio: profRow?.bio ?? null,
            portfolio_text: profRow?.portfolio_text ?? null,
            portfolio_item_count: n,
          }
        : null;

    return NextResponse.json({
      membership: {
        ...data,
        account_status: String((data as { payment_status?: string }).payment_status ?? "") === "success" ? "active" : "inactive",
        profile: mergedProfile,
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
