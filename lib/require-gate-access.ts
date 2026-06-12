import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export async function requireGateAccess(req: NextRequest): Promise<
  | { admin: SupabaseClient; userId: string }
  | { error: NextResponse }
> {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace(/^Bearer\s+/i, "").trim();
  if (!token) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseAnonKey || !serviceKey) {
    return { error: NextResponse.json({ error: "Server configuration missing" }, { status: 500 }) };
  }

  const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: { user }, error: userErr } = await supabaseAuth.auth.getUser(token);
  if (userErr || !user) return { error: NextResponse.json({ error: "Invalid session" }, { status: 401 }) };

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  const { data: pm } = await admin
    .from("portal_members")
    .select("role, features")
    .eq("user_id", user.id)
    .maybeSingle();
  const { data: au } = await admin.from("admin_users").select("user_id").eq("user_id", user.id).maybeSingle();
  const isPortal = !!pm || !!au;
  const isAdmin = !!au || (!!pm && (pm.role === "admin" || pm.role === "manager"));
  const hasReports =
    isAdmin ||
    (Array.isArray((pm as { features?: string[] })?.features) &&
      (pm as { features?: string[] }).features?.includes("reports"));

  if (!isPortal || !hasReports) {
    return { error: NextResponse.json({ error: "Gate access requires reports permission" }, { status: 403 }) };
  }

  return { admin, userId: user.id };
}
