import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

async function getCallerAdminRole(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace(/^Bearer\s+/i, "").trim();
  if (!token) return { role: null as string | null };

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return { role: null as string | null };

  const admin = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: userData, error: userErr } = await admin.auth.getUser(token);
  if (userErr || !userData?.user) return { role: null as string | null };

  const userId = String(userData.user.id ?? "");
  if (!userId) return { role: null as string | null };

  try {
    const { data: memberRow, error: memberErr } = await admin
      .from("portal_members")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle();

    if (memberErr) {
      const msg = String(memberErr.message ?? "").toLowerCase();
      const code = String((memberErr as any).code ?? "");
      const missingPortal = code === "42P01" || (msg.includes("portal_members") && msg.includes("does not exist"));
      if (missingPortal) {
        const { data: legacyAdminRow } = await admin
          .from("admin_users")
          .select("user_id")
          .eq("user_id", userId)
          .maybeSingle();
        return { role: legacyAdminRow ? "admin" : null };
      }
      return { role: null };
    }

    return { role: String(memberRow?.role ?? "") || null };
  } catch {
    return { role: null };
  }
}

export async function POST(req: NextRequest) {
  let body: { route?: string };
  try {
    body = (await req.json()) as { route?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const route = body?.route?.trim();
  if (!route) return NextResponse.json({ error: "route is required" }, { status: 400 });

  const { role } = await getCallerAdminRole(req);
  if (role !== "admin" && role !== "manager") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: "Server configuration missing" }, { status: 500 });
  }

  const admin = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { error } = await admin.from("fusion_managed_pages").delete().eq("route", route);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

