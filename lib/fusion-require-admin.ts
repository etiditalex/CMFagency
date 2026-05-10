import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export async function requireAdminOrManager(req: NextRequest): Promise<
  | { admin: SupabaseClient; userId: string }
  | { error: NextResponse }
> {
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

  return { admin, userId: callerId };
}

function parsePortalFeatureList(raw: unknown): string[] {
  return Array.isArray(raw) ? raw.map((f) => String(f).toLowerCase().trim()) : [];
}

/**
 * Fusion Xpress KCM dashboard APIs: full admin, manager, legacy admin_users,
 * or a client with `kcm_membership` in portal_members.features.
 */
export async function requireFusionKcmMembershipAccess(req: NextRequest): Promise<
  | { admin: SupabaseClient; userId: string }
  | { error: NextResponse }
> {
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

  const { data: memberRow } = await admin
    .from("portal_members")
    .select("role,features")
    .eq("user_id", callerId)
    .maybeSingle();

  const role = String((memberRow as { role?: string } | null)?.role ?? "").toLowerCase();
  const feats = parsePortalFeatureList((memberRow as { features?: unknown } | null)?.features);

  const isLegacyAdmin = !memberRow
    ? (await admin.from("admin_users").select("user_id").eq("user_id", callerId).maybeSingle()).data != null
    : false;

  if (role === "employer") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  const ok =
    role === "admin" ||
    role === "manager" ||
    isLegacyAdmin ||
    (role === "client" && feats.includes("kcm_membership"));

  if (!ok) {
    return { error: NextResponse.json({ error: "Forbidden: KCM membership access required" }, { status: 403 }) };
  }

  return { admin, userId: callerId };
}
