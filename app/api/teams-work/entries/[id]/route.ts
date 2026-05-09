import { NextRequest, NextResponse } from "next/server";
import { requirePortalMember } from "@/lib/teams-work-auth";

function safeText(v: unknown, max: number) {
  const s = typeof v === "string" ? v.trim() : "";
  if (!s) return null;
  return s.slice(0, max);
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requirePortalMember(req);
    if ("error" in auth) return auth.error;
    const { admin, caller, isAdmin } = auth;

    const { id } = await ctx.params;
    const entryId = String(id ?? "").trim();
    if (!entryId) return NextResponse.json({ error: "Missing entry id" }, { status: 400 });

    const payload = (await req.json().catch(() => ({}))) as Record<string, unknown>;

    const statusRaw = safeText(payload.status, 40);
    const admin_note = safeText(payload.admin_note, 2000);
    const title = safeText(payload.title, 140);
    const body = safeText(payload.body, 12000);

    const { data: existing, error: readErr } = await (admin as any)
      .from("teams_work_entries")
      .select("id,user_id,status")
      .eq("id", entryId)
      .maybeSingle();
    if (readErr) return NextResponse.json({ error: readErr.message }, { status: 500 });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const ownerId = String((existing as any).user_id ?? "");
    const isOwner = ownerId && ownerId === caller.id;

    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };

    // Admin status updates.
    if (statusRaw != null) {
      if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      const s = statusRaw.toLowerCase();
      const allowed = ["submitted", "verified", "needs_changes", "rejected"];
      if (!allowed.includes(s)) return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      update.status = s;
      update.admin_note = admin_note;
    }

    // Member edits: only their own entry, and only while submitted/needs_changes.
    if (title != null || body != null) {
      if (!isOwner) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      const currentStatus = String((existing as any).status ?? "submitted");
      if (!["submitted", "needs_changes"].includes(currentStatus)) {
        return NextResponse.json({ error: "This entry can no longer be edited." }, { status: 400 });
      }
      if (title != null) update.title = title;
      if (body != null) update.body = body;
    }

    const { data: row, error: updErr } = await (admin as any)
      .from("teams_work_entries")
      .update(update as any)
      .eq("id", entryId)
      .select("id,user_id,user_email,entry_type,title,body,work_date,status,admin_note,created_at,updated_at")
      .single();
    if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

    const { data: attachments } = await (admin as any)
      .from("teams_work_attachments")
      .select("id,entry_id,file_url,file_name,mime_type,size_bytes,created_at")
      .eq("entry_id", entryId)
      .order("created_at", { ascending: false });

    return NextResponse.json({ ok: true, entry: { ...row, attachments: attachments ?? [] } });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

