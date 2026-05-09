import { NextRequest, NextResponse } from "next/server";
import { requirePortalMember } from "@/lib/teams-work-auth";

function safeText(v: unknown, max: number) {
  const s = typeof v === "string" ? v.trim() : "";
  if (!s) return null;
  return s.slice(0, max);
}

function safeDate(v: unknown) {
  if (typeof v !== "string") return null;
  const s = v.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  return s;
}

export async function GET(req: NextRequest) {
  try {
    const auth = await requirePortalMember(req);
    if ("error" in auth) return auth.error;
    const { admin, caller, isAdmin } = auth;

    const { searchParams } = new URL(req.url);
    const scope = (searchParams.get("scope") ?? "me").trim().toLowerCase();
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") ?? "40", 10) || 40, 1), 200);
    const offset = Math.max(parseInt(searchParams.get("offset") ?? "0", 10) || 0, 0);
    const status = safeText(searchParams.get("status"), 40);
    const userId = safeText(searchParams.get("user_id"), 80);

    let q = (admin as any)
      .from("teams_work_entries")
      .select("id,user_id,user_email,entry_type,title,body,work_date,status,admin_note,created_at,updated_at", { count: "exact" })
      .order("work_date", { ascending: false })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (scope === "all") {
      if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      if (status) q = q.eq("status", status);
      if (userId) q = q.eq("user_id", userId);
    } else {
      q = q.eq("user_id", caller.id);
    }

    const { data: entries, error, count } = await q;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const ids = (entries ?? []).map((e: any) => String(e.id));
    const { data: attachments } = ids.length
      ? await (admin as any)
          .from("teams_work_attachments")
          .select("id,entry_id,file_url,file_name,mime_type,size_bytes,created_at")
          .in("entry_id", ids)
          .order("created_at", { ascending: false })
      : { data: [] as any[] };
    const byEntry: Record<string, any[]> = {};
    for (const a of attachments ?? []) {
      const k = String((a as any).entry_id);
      byEntry[k] = byEntry[k] ?? [];
      byEntry[k].push(a);
    }

    const hydrated = (entries ?? []).map((e: any) => ({
      ...e,
      attachments: byEntry[String(e.id)] ?? [],
    }));

    return NextResponse.json({ entries: hydrated, total: count ?? hydrated.length, limit, offset });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requirePortalMember(req);
    if ("error" in auth) return auth.error;
    const { admin, caller } = auth;

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const entryTypeRaw = String(body.entry_type ?? body.type ?? "daily_log").trim().toLowerCase();
    const entry_type = entryTypeRaw === "upload" ? "upload" : "daily_log";

    const title = safeText(body.title, 140);
    const textBody = safeText(body.body, 12000);
    const work_date = safeDate(body.work_date) ?? null;

    if (entry_type === "daily_log" && !textBody) {
      return NextResponse.json({ error: "Body is required for daily log entries." }, { status: 400 });
    }

    const { data: row, error } = await (admin as any)
      .from("teams_work_entries")
      .insert({
        user_id: caller.id,
        user_email: caller.email,
        entry_type,
        title,
        body: textBody,
        work_date: work_date ?? undefined,
        status: "submitted",
      })
      .select("id,user_id,user_email,entry_type,title,body,work_date,status,admin_note,created_at,updated_at")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, entry: { ...row, attachments: [] } });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

