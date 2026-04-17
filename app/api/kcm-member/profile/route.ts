import { NextRequest, NextResponse } from "next/server";
import { getKcmAdminClient, getKcmMemberSession } from "@/lib/kcm-member-auth";

export async function PATCH(req: NextRequest) {
  try {
    const session = await getKcmMemberSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = (await req.json().catch(() => ({}))) as {
      display_name?: string;
      bio?: string;
      portfolio_text?: string;
      profile_category?: string;
      professional_title?: string;
      social_instagram?: string;
      social_facebook?: string;
      social_tiktok?: string;
      social_x?: string;
    };
    const displayName = String(body.display_name ?? "").trim();
    const bio = String(body.bio ?? "").trim();
    const portfolioText = String(body.portfolio_text ?? "").trim().slice(0, 12000);
    const rawCategory = String(body.profile_category ?? "high_fashion_model").trim().toLowerCase();
    const category = rawCategory === "pageant_model" ? "pageant_model" : "high_fashion_model";
    const professionalTitle = String(body.professional_title ?? "").trim().slice(0, 180);
    const socialInstagram = String(body.social_instagram ?? "").trim().slice(0, 255);
    const socialFacebook = String(body.social_facebook ?? "").trim().slice(0, 255);
    const socialTiktok = String(body.social_tiktok ?? "").trim().slice(0, 255);
    const socialX = String(body.social_x ?? "").trim().slice(0, 255);

    const admin = getKcmAdminClient();
    if (!admin) return NextResponse.json({ error: "Server configuration error." }, { status: 500 });

    const { error } = await admin.from("kcm_member_profiles").upsert(
      {
        membership_id: session.membershipId,
        email: session.email,
        display_name: displayName || null,
        bio: bio || null,
        portfolio_text: portfolioText || null,
        profile_category: category,
        professional_title: professionalTitle || null,
        social_instagram: socialInstagram || null,
        social_facebook: socialFacebook || null,
        social_tiktok: socialTiktok || null,
        social_x: socialX || null,
      },
      { onConflict: "membership_id" }
    );
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const { data: profile } = await admin
      .from("kcm_member_profiles")
      .select("id,display_name,avatar_url,cover_url,profile_category,professional_title,bio,portfolio_text,social_instagram,social_facebook,social_tiktok,social_x,updated_at")
      .eq("membership_id", session.membershipId)
      .maybeSingle();

    return NextResponse.json({ ok: true, profile: profile ?? null });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
