import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { processInterviewInvite } from "@/lib/process-interview-invite";

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
 * POST: Send interview invite email (office from job catalog) and set status to interview_invited.
 * Body: { interviewDate?: string, interviewTime?: string } (optional; shown in email when set)
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdminOrManager(req);
    if ("error" in auth) return auth.error;
    const { admin } = auth;

    const { id } = await params;
    if (!id) return NextResponse.json({ error: "Missing application id" }, { status: 400 });

    const body = (await req.json().catch(() => ({}))) as {
      interviewDate?: string;
      interviewTime?: string;
    };

    const interviewDate =
      typeof body.interviewDate === "string" ? body.interviewDate.trim() : undefined;
    const interviewTime =
      typeof body.interviewTime === "string" ? body.interviewTime.trim() : undefined;

    const result = await processInterviewInvite(admin, id, { interviewDate, interviewTime });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: result.httpStatus });
    }

    return NextResponse.json({ ok: true, application: result.application });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
