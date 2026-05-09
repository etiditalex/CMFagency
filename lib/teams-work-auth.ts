import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export type TeamsWorkRole = "admin" | "manager" | "client" | "employer";

export type TeamsWorkAuthResult =
  | {
      // Keep this as `any` because this codebase doesn't have generated Supabase
      // table types for Teams Work yet, and Next build can infer `never` types.
      admin: any;
      caller: { id: string; email: string | null };
      role: TeamsWorkRole;
      isAdmin: boolean;
    }
  | { error: NextResponse };

export function getServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return null;
  return createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function bearerFromReq(req: NextRequest) {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  return token || null;
}

export async function requirePortalMember(req: NextRequest): Promise<TeamsWorkAuthResult> {
  const token = bearerFromReq(req);
  if (!token) return { error: NextResponse.json({ error: "Missing authorization" }, { status: 401 }) };

  const admin = getServiceClient();
  if (!admin) return { error: NextResponse.json({ error: "Server configuration error" }, { status: 500 }) };

  const { data: callerData, error: callerErr } = await admin.auth.getUser(token);
  if (callerErr || !callerData?.user) {
    return { error: NextResponse.json({ error: "Invalid session" }, { status: 401 }) };
  }

  const callerId = String(callerData.user.id ?? "");
  const callerEmail = (callerData.user.email ?? null) as string | null;

  // Prefer portal_members role; fallback to legacy admin allowlist.
  const { data: memberRow, error: memberErr } = await admin
    .from("portal_members")
    .select("role")
    .eq("user_id", callerId)
    .maybeSingle();

  if (memberErr) {
    // If portal_members doesn't exist yet, fallback to admin_users.
    const msg = String((memberErr as any)?.message ?? "");
    const code = String((memberErr as any)?.code ?? "");
    const missing = code === "42P01" || (msg.includes("portal_members") && msg.includes("does not exist"));
    if (missing) {
      const { data: legacyAdmin } = await admin.from("admin_users").select("user_id").eq("user_id", callerId).maybeSingle();
      if (!legacyAdmin) return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
      return { admin, caller: { id: callerId, email: callerEmail }, role: "admin", isAdmin: true };
    }
    return { error: NextResponse.json({ error: "Authorization error" }, { status: 500 }) };
  }

  if (!memberRow?.role) return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };

  const role = String(memberRow.role ?? "client").toLowerCase() as TeamsWorkRole;
  if (role === "employer") return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };

  return {
    admin,
    caller: { id: callerId, email: callerEmail },
    role,
    isAdmin: role === "admin" || role === "manager",
  };
}

