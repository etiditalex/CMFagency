import { NextResponse } from "next/server";
import { getKcmAdminClient, getKcmMemberSession } from "@/lib/kcm-member-auth";

export async function GET() {
  try {
    const session = await getKcmMemberSession();
    if (!session) return NextResponse.json({ authenticated: false }, { status: 401 });

    const admin = getKcmAdminClient();
    if (!admin) return NextResponse.json({ error: "Server configuration error." }, { status: 500 });

    const { data: membership, error: mErr } = await admin
      .from("kcm_memberships")
      .select("id,first_name,second_name,contact,email,payment_status,payment_confirmed,status,created_at")
      .eq("id", session.membershipId)
      .maybeSingle();
    if (mErr) return NextResponse.json({ error: mErr.message }, { status: 500 });
    if (!membership) return NextResponse.json({ authenticated: false }, { status: 401 });

    const { data: profile, error: pErr } = await admin
      .from("kcm_member_profiles")
      .select("id,display_name,avatar_url,cover_url,profile_category,professional_title,bio,portfolio_text,social_instagram,social_facebook,social_tiktok,social_x,updated_at")
      .eq("membership_id", session.membershipId)
      .maybeSingle();
    if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 });

    const { data: portfolioRows, error: portErr } = await admin
      .from("kcm_member_portfolio_items")
      .select("id,file_url,mime_type,caption,sort_order,created_at")
      .eq("membership_id", session.membershipId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (portErr) return NextResponse.json({ error: portErr.message }, { status: 500 });

    const paymentStatus = String((membership as { payment_status?: string }).payment_status ?? "pending");
    const accountStatus = paymentStatus === "success" ? "active" : "inactive";

    return NextResponse.json({
      authenticated: true,
      account_status: accountStatus,
      membership: membership,
      profile: profile ?? null,
      portfolio_items: portfolioRows ?? [],
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
