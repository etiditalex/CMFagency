import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * GET: List all portal members (admin/full admin only).
 * Returns user_id, email, role, tier, features, created_at.
 */
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace(/^Bearer\s+/i, "").trim();
    if (!token) return NextResponse.json({ error: "Missing authorization" }, { status: 401 });

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: callerData, error: callerErr } = await admin.auth.getUser(token);
    if (callerErr || !callerData?.user) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const callerId = String(callerData.user.id ?? "");
    const { data: memberRow } = await admin.from("portal_members").select("role").eq("user_id", callerId).maybeSingle();
    const isFullAdmin = memberRow?.role === "admin";
    const isManager = memberRow?.role === "manager";
    const isLegacyAdmin = !memberRow
      ? (await admin.from("admin_users").select("user_id").eq("user_id", callerId).maybeSingle()).data != null
      : false;

    if (!isFullAdmin && !isManager && !isLegacyAdmin) {
      return NextResponse.json({ error: "Forbidden: admin or manager access required" }, { status: 403 });
    }

    const { data: members, error: pmErr } = await admin
      .from("portal_members")
      .select("user_id,role,tier,features,created_at")
      .order("created_at", { ascending: false });

    if (pmErr) return NextResponse.json({ error: pmErr.message }, { status: 500 });
    const rows = members ?? [];

    const { data: usersData } = await admin.auth.admin.listUsers({ perPage: 1000 });
    const emailsById: Record<string, string> = {};
    for (const u of usersData?.users ?? []) {
      if (u.id && u.email) emailsById[u.id] = u.email;
    }

    const list = rows.map((m: { user_id: string; role: string; tier: string; features: unknown }) => ({
      user_id: m.user_id,
      email: emailsById[m.user_id] ?? "—",
      role: m.role,
      tier: m.tier,
      features: Array.isArray(m.features) ? m.features : [],
      created_at: (m as any).created_at,
    }));

    return NextResponse.json({ users: list });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
