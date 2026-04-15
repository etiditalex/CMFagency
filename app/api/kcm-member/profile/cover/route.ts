import { NextRequest, NextResponse } from "next/server";
import { getKcmAdminClient, getKcmMemberSession } from "@/lib/kcm-member-auth";

const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const BUCKET = "kcm-covers";

export async function POST(req: NextRequest) {
  try {
    const session = await getKcmMemberSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = getKcmAdminClient();
    if (!admin) return NextResponse.json({ error: "Server configuration error." }, { status: 500 });

    const formData = await req.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Image file is required." }, { status: 400 });
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: `Invalid file type. Use: ${ALLOWED_TYPES.join(", ")}` }, { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "File too large. Max 5MB." }, { status: 400 });
    }

    const { data: bucket } = await admin.storage.getBucket(BUCKET);
    if (!bucket) {
      await admin.storage.createBucket(BUCKET, { public: true, fileSizeLimit: `${MAX_SIZE}`, allowedMimeTypes: ALLOWED_TYPES });
    }

    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${session.membershipId}/cover-${Date.now()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const { error: uploadErr } = await admin.storage.from(BUCKET).upload(path, buffer, {
      upsert: true,
      contentType: file.type,
    });
    if (uploadErr) return NextResponse.json({ error: uploadErr.message }, { status: 500 });

    const { data: pub } = admin.storage.from(BUCKET).getPublicUrl(path);
    const coverUrl = pub.publicUrl;

    const { data: existing } = await admin
      .from("kcm_member_profiles")
      .select("display_name,bio,portfolio_text,avatar_url,profile_category,professional_title,social_instagram,social_facebook,social_tiktok,social_x")
      .eq("membership_id", session.membershipId)
      .maybeSingle();

    const { error: profileErr } = await admin.from("kcm_member_profiles").upsert(
      {
        membership_id: session.membershipId,
        email: session.email,
        cover_url: coverUrl,
        avatar_url: (existing as { avatar_url?: string | null } | null)?.avatar_url ?? null,
        display_name: (existing as { display_name?: string | null } | null)?.display_name ?? null,
        bio: (existing as { bio?: string | null } | null)?.bio ?? null,
        portfolio_text: (existing as { portfolio_text?: string | null } | null)?.portfolio_text ?? null,
        profile_category: (existing as { profile_category?: string | null } | null)?.profile_category ?? "creative",
        professional_title: (existing as { professional_title?: string | null } | null)?.professional_title ?? null,
        social_instagram: (existing as { social_instagram?: string | null } | null)?.social_instagram ?? null,
        social_facebook: (existing as { social_facebook?: string | null } | null)?.social_facebook ?? null,
        social_tiktok: (existing as { social_tiktok?: string | null } | null)?.social_tiktok ?? null,
        social_x: (existing as { social_x?: string | null } | null)?.social_x ?? null,
      },
      { onConflict: "membership_id" }
    );
    if (profileErr) return NextResponse.json({ error: profileErr.message }, { status: 500 });

    return NextResponse.json({ ok: true, cover_url: coverUrl });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
