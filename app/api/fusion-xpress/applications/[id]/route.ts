import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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
 * GET: Fetch a single application by id.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdminOrManager(req);
    if ("error" in auth) return auth.error;
    const { admin } = auth;

    const { id } = await params;
    if (!id) return NextResponse.json({ error: "Missing application id" }, { status: 400 });

    const { data, error } = await admin
      .from("applications")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") return NextResponse.json({ error: "Application not found" }, { status: 404 });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ application: data });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * PATCH: Update application (status, notes). Body: { status?, notes? }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdminOrManager(req);
    if ("error" in auth) return auth.error;
    const { admin } = auth;

    const { id } = await params;
    if (!id) return NextResponse.json({ error: "Missing application id" }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const status = typeof body.status === "string" ? body.status.trim() : undefined;
    const notes = typeof body.notes === "string" ? body.notes : body.notes === null ? null : undefined;

    const allowedStatuses = ["pending", "under review", "qualified", "accepted", "rejected"];
    if (status !== undefined && !allowedStatuses.includes(status)) {
      return NextResponse.json(
        { error: "Invalid status. Use: pending, under review, qualified, accepted, rejected" },
        { status: 400 }
      );
    }

    const updates: Record<string, unknown> = {};
    if (status !== undefined) updates.status = status;
    if (notes !== undefined) updates.notes = notes;
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid updates (status or notes)" }, { status: 400 });
    }

    const { data, error } = await admin
      .from("applications")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") return NextResponse.json({ error: "Application not found" }, { status: 404 });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ application: data });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
