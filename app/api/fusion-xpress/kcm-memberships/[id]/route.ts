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
      .select("display_name,avatar_url,bio")
      .eq("membership_id", id)
      .maybeSingle();

    return NextResponse.json({
      membership: {
        ...data,
        account_status: String((data as { payment_status?: string }).payment_status ?? "") === "success" ? "active" : "inactive",
        profile: profile ?? null,
        profile_completed: !!(profile as { display_name?: string | null; avatar_url?: string | null } | null)?.display_name ||
          !!(profile as { display_name?: string | null; avatar_url?: string | null } | null)?.avatar_url,
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
