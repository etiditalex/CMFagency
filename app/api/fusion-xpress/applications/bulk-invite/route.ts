import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { processInterviewInvite } from "@/lib/process-interview-invite";

const MAX_BULK = 40;

async function requireAdminOrManager(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace(/^Bearer\s+/i, "").trim();
  if (!token) return { error: NextResponse.json({ error: "Missing authorization" }, { status: 401 }) };

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return { error: NextResponse.json({ error: "Server configuration error" }, { status: 500 }) };
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: callerData, error: callerErr } = await admin.auth.getUser(token);
  if (callerErr || !callerData?.user) {
    return { error: NextResponse.json({ error: "Invalid session" }, { status: 401 }) };
  }

  const callerId = String(callerData.user.id ?? "");
  const { data: memberRow } = await admin.from("portal_members").select("role").eq("user_id", callerId).maybeSingle();
  const isManager = memberRow?.role === "manager";
  const isAdmin = memberRow?.role === "admin";
  const isLegacyAdmin = !memberRow
    ? (await admin.from("admin_users").select("user_id").eq("user_id", callerId).maybeSingle()).data != null
    : false;

  if (!isAdmin && !isManager && !isLegacyAdmin) {
    return { error: NextResponse.json({ error: "Forbidden: admin or manager access required" }, { status: 403 }) };
  }

  return { admin };
}

/**
 * POST: { ids: string[], interviewDate?: string, interviewTime?: string }
 * Processes each id sequentially; returns per-id results.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdminOrManager(req);
    if ("error" in auth) return auth.error;
    const { admin } = auth;

    const body = (await req.json().catch(() => ({}))) as {
      ids?: unknown;
      interviewDate?: string;
      interviewTime?: string;
    };

    if (!Array.isArray(body.ids) || body.ids.length === 0) {
      return NextResponse.json({ error: "Provide a non-empty ids array" }, { status: 400 });
    }

    const ids = body.ids
      .filter((x): x is string => typeof x === "string" && x.length > 0)
      .slice(0, MAX_BULK);

    if (ids.length === 0) {
      return NextResponse.json({ error: "No valid application ids" }, { status: 400 });
    }

    const interviewDate =
      typeof body.interviewDate === "string" ? body.interviewDate.trim() : undefined;
    const interviewTime =
      typeof body.interviewTime === "string" ? body.interviewTime.trim() : undefined;

    const results: { id: string; ok: boolean; error?: string }[] = [];

    for (const id of ids) {
      const result = await processInterviewInvite(admin, id, { interviewDate, interviewTime });
      if (result.success) {
        results.push({ id, ok: true });
      } else {
        results.push({ id, ok: false, error: result.error });
      }
    }

    const okCount = results.filter((r) => r.ok).length;
    return NextResponse.json({ results, okCount, total: results.length });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
