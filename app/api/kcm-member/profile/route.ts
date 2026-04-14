import { NextRequest, NextResponse } from "next/server";
import { getKcmAdminClient, getKcmMemberSession } from "@/lib/kcm-member-auth";

export async function PATCH(req: NextRequest) {
  try {
    const session = await getKcmMemberSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = (await req.json().catch(() => ({}))) as { display_name?: string; bio?: string };
    const displayName = String(body.display_name ?? "").trim();
    const bio = String(body.bio ?? "").trim();

    const admin = getKcmAdminClient();
    if (!admin) return NextResponse.json({ error: "Server configuration error." }, { status: 500 });

    const { error } = await admin.from("kcm_member_profiles").upsert(
      {
        membership_id: session.membershipId,
        email: session.email,
        display_name: displayName || null,
        bio: bio || null,
      },
      { onConflict: "membership_id" }
    );
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const { data: profile } = await admin
      .from("kcm_member_profiles")
      .select("id,display_name,avatar_url,bio,updated_at")
      .eq("membership_id", session.membershipId)
      .maybeSingle();

    return NextResponse.json({ ok: true, profile: profile ?? null });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
