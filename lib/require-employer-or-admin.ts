import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type JobBoardPortalAccess =
  | { admin: SupabaseClient; userId: string; mode: "admin" }
  | { admin: SupabaseClient; userId: string; mode: "employer" };

/**
 * Job board management: full admins/managers (and legacy admin_users), or portal role `employer` (own listings only).
 */
export async function requireEmployerOrAdminForJobBoard(req: NextRequest): Promise<
  JobBoardPortalAccess | { error: NextResponse }
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
  const role = String((memberRow as { role?: string } | null)?.role ?? "").toLowerCase();

  const isLegacyAdmin =
    !memberRow &&
    (await admin.from("admin_users").select("user_id").eq("user_id", callerId).maybeSingle()).data != null;

  if (isLegacyAdmin || role === "admin" || role === "manager") {
    return { admin, userId: callerId, mode: "admin" };
  }
  if (role === "employer") {
    return { admin, userId: callerId, mode: "employer" };
  }

  return { error: NextResponse.json({ error: "Forbidden: employer or admin access required" }, { status: 403 }) };
}
