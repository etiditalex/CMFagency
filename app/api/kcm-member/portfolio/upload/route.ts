import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getKcmAdminClient, getKcmMemberSession } from "@/lib/kcm-member-auth";

const BUCKET = "kcm-portfolio";
const MAX_ITEMS = 15;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_PDF_BYTES = 6 * 1024 * 1024;
const ALLOWED: Record<string, { max: number }> = {
  "image/jpeg": { max: MAX_IMAGE_BYTES },
  "image/png": { max: MAX_IMAGE_BYTES },
  "image/webp": { max: MAX_IMAGE_BYTES },
  "application/pdf": { max: MAX_PDF_BYTES },
};

export async function POST(req: NextRequest) {
  try {
    const session = await getKcmMemberSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = getKcmAdminClient();
    if (!admin) return NextResponse.json({ error: "Server configuration error." }, { status: 500 });

    const { count: existingCount, error: countErr } = await admin
      .from("kcm_member_portfolio_items")
      .select("*", { count: "exact", head: true })
      .eq("membership_id", session.membershipId);
    if (countErr) return NextResponse.json({ error: countErr.message }, { status: 500 });
    if ((existingCount ?? 0) >= MAX_ITEMS) {
      return NextResponse.json({ error: `Maximum ${MAX_ITEMS} portfolio files allowed.` }, { status: 400 });
    }

    const formData = await req.formData();
    const file = formData.get("file");
    const captionRaw = formData.get("caption");
    const caption =
      typeof captionRaw === "string" ? captionRaw.trim().slice(0, 500) : "";

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "File is required." }, { status: 400 });
    }

    const rule = ALLOWED[file.type];
    if (!rule) {
      return NextResponse.json(
        { error: "Invalid file type. Use JPG, PNG, WebP, or PDF." },
        { status: 400 }
      );
    }
    if (file.size > rule.max) {
      return NextResponse.json({ error: "File too large for this type." }, { status: 400 });
    }

    const { data: bucket } = await admin.storage.getBucket(BUCKET);
    if (!bucket) {
      await admin.storage.createBucket(BUCKET, {
        public: true,
        fileSizeLimit: String(MAX_IMAGE_BYTES),
        allowedMimeTypes: Object.keys(ALLOWED),
      });
    }

    const ext =
      file.type === "application/pdf"
        ? "pdf"
        : file.type === "image/png"
          ? "png"
          : file.type === "image/webp"
            ? "webp"
            : "jpg";

    const itemId = randomUUID();
    const storagePath = `${session.membershipId}/${itemId}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const { error: uploadErr } = await admin.storage.from(BUCKET).upload(storagePath, buffer, {
      upsert: false,
      contentType: file.type,
    });
    if (uploadErr) return NextResponse.json({ error: uploadErr.message }, { status: 500 });

    const { data: pub } = admin.storage.from(BUCKET).getPublicUrl(storagePath);
    const fileUrl = pub.publicUrl;

    const { data: maxRow } = await admin
      .from("kcm_member_portfolio_items")
      .select("sort_order")
      .eq("membership_id", session.membershipId)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextOrder = ((maxRow as { sort_order?: number } | null)?.sort_order ?? -1) + 1;

    const { data: row, error: insertErr } = await admin
      .from("kcm_member_portfolio_items")
      .insert({
        membership_id: session.membershipId,
        storage_path: storagePath,
        file_url: fileUrl,
        mime_type: file.type,
        caption: caption || null,
        sort_order: nextOrder,
      })
      .select("id,file_url,mime_type,caption,sort_order,created_at")
      .single();
    if (insertErr) {
      await admin.storage.from(BUCKET).remove([storagePath]);
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, item: row });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
