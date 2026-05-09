import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { requirePortalMember } from "@/lib/teams-work-auth";

const BUCKET = "teams-work-attachments";
const MAX_BYTES = 12 * 1024 * 1024;
const ALLOWED = [
  "application/pdf",
  "application/zip",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "image/jpeg",
  "image/png",
  "image/webp",
  "text/plain",
];

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requirePortalMember(req);
    if ("error" in auth) return auth.error;
    const { admin, caller, isAdmin } = auth;

    const { id } = await ctx.params;
    const entryId = String(id ?? "").trim();
    if (!entryId) return NextResponse.json({ error: "Missing entry id" }, { status: 400 });

    const { data: entry, error: entryErr } = await admin
      .from("teams_work_entries")
      .select("id,user_id,entry_type")
      .eq("id", entryId)
      .maybeSingle();
    if (entryErr) return NextResponse.json({ error: entryErr.message }, { status: 500 });
    if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const ownerId = String((entry as any).user_id ?? "");
    const isOwner = ownerId && ownerId === caller.id;
    if (!isOwner && !isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const formData = await req.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "File is required." }, { status: 400 });
    if (!ALLOWED.includes(file.type)) {
      return NextResponse.json({ error: "Invalid file type." }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "File too large." }, { status: 400 });
    }

    const { data: bucket } = await admin.storage.getBucket(BUCKET);
    if (!bucket) {
      await admin.storage.createBucket(BUCKET, {
        public: true,
        fileSizeLimit: String(MAX_BYTES),
        allowedMimeTypes: ALLOWED,
      });
    }

    const originalName = String(file.name ?? "upload").slice(0, 160);
    const ext = originalName.includes(".") ? originalName.split(".").pop()!.toLowerCase().slice(0, 12) : "";
    const attachmentId = randomUUID();
    const safeExt = ext ? `.${ext}` : "";
    const storagePath = `${ownerId || "unknown"}/${entryId}/${attachmentId}${safeExt}`;

    const buffer = Buffer.from(await file.arrayBuffer());
    const { error: uploadErr } = await admin.storage.from(BUCKET).upload(storagePath, buffer, {
      upsert: false,
      contentType: file.type,
    });
    if (uploadErr) return NextResponse.json({ error: uploadErr.message }, { status: 500 });

    const { data: pub } = admin.storage.from(BUCKET).getPublicUrl(storagePath);
    const fileUrl = pub.publicUrl;

    // Note: Supabase type generation isn't wired for this table yet, so we cast to any to
    // avoid "never" insert types during Next.js build.
    const { data: row, error: insErr } = await (admin as any)
      .from("teams_work_attachments")
      .insert({
        entry_id: entryId,
        storage_bucket: BUCKET,
        storage_path: storagePath,
        file_url: fileUrl,
        file_name: originalName,
        mime_type: file.type,
        size_bytes: file.size,
      })
      .select("id,entry_id,file_url,file_name,mime_type,size_bytes,created_at")
      .single();

    if (insErr) {
      await admin.storage.from(BUCKET).remove([storagePath]);
      return NextResponse.json({ error: insErr.message }, { status: 500 });
    }

    // If entry was created as an upload placeholder, keep it as upload type.
    // (No-op if it already is.)
    await (admin as any)
      .from("teams_work_entries")
      .update({ entry_type: "upload", updated_at: new Date().toISOString() })
      .eq("id", entryId);

    return NextResponse.json({ ok: true, attachment: row });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

