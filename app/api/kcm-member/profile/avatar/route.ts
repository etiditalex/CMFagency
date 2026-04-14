import { NextRequest, NextResponse } from "next/server";
import { getKcmAdminClient, getKcmMemberSession } from "@/lib/kcm-member-auth";

const MAX_SIZE = 3 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const BUCKET = "kcm-avatars";

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
      return NextResponse.json({ error: "File too large. Max 3MB." }, { status: 400 });
    }

    const { data: bucket } = await admin.storage.getBucket(BUCKET);
    if (!bucket) {
      await admin.storage.createBucket(BUCKET, { public: true, fileSizeLimit: `${MAX_SIZE}`, allowedMimeTypes: ALLOWED_TYPES });
    }

    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${session.membershipId}/avatar-${Date.now()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const { error: uploadErr } = await admin.storage.from(BUCKET).upload(path, buffer, {
      upsert: true,
      contentType: file.type,
    });
    if (uploadErr) return NextResponse.json({ error: uploadErr.message }, { status: 500 });

    const { data: pub } = admin.storage.from(BUCKET).getPublicUrl(path);
    const avatarUrl = pub.publicUrl;

    const { error: profileErr } = await admin.from("kcm_member_profiles").upsert(
      {
        membership_id: session.membershipId,
        email: session.email,
        avatar_url: avatarUrl,
      },
      { onConflict: "membership_id" }
    );
    if (profileErr) return NextResponse.json({ error: profileErr.message }, { status: 500 });

    return NextResponse.json({ ok: true, avatar_url: avatarUrl });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
