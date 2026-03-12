import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Ensures the request is from an admin or manager (Fusion Xpress).
 */
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
 * GET: List job applications. Query: status, application_type, limit, offset.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdminOrManager(req);
    if ("error" in auth) return auth.error;
    const { admin } = auth;

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status")?.trim() || undefined;
    const applicationType = searchParams.get("application_type")?.trim() || undefined;
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") ?? "50", 10), 1, 200), 200);
    const offset = Math.max(parseInt(searchParams.get("offset") ?? "0", 10), 0);

    let query = admin
      .from("applications")
      .select("id,cmf_agency_id,user_id,national_id,phone,email,name,full_name,application_type,job_position,status,personal_details,documents,notes,created_at,updated_at", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) query = query.eq("status", status);
    if (applicationType) query = query.eq("application_type", applicationType);

    const { data: rows, error, count } = await query;

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const applications = (rows ?? []).map((r: Record<string, unknown>) => ({
      id: r.id,
      cmf_agency_id: r.cmf_agency_id,
      user_id: r.user_id,
      national_id: r.national_id,
      phone: r.phone,
      email: r.email,
      name: r.name,
      full_name: r.full_name,
      application_type: r.application_type,
      job_position: r.job_position,
      status: r.status,
      personal_details: r.personal_details,
      documents: r.documents,
      notes: r.notes,
      created_at: r.created_at,
      updated_at: r.updated_at,
    }));

    return NextResponse.json({
      applications,
      total: count ?? applications.length,
      limit,
      offset,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
