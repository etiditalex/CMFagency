import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export function getVisitorServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return null;
  return createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function parseFeatures(raw: unknown): string[] {
  return Array.isArray(raw) ? raw.map((f) => String(f).toLowerCase().trim()) : [];
}

export type VisitorManagementAuth =
  | {
      /** Untyped until Supabase generated types include visitor tables. */
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      admin: any;
      userId: string;
      isAdmin: boolean;
    }
  | { error: NextResponse };

export async function requireVisitorManagementAccess(
  req: NextRequest
): Promise<VisitorManagementAuth> {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) {
    return { error: NextResponse.json({ error: "Missing authorization" }, { status: 401 }) };
  }

  const admin = getVisitorServiceClient();
  if (!admin) {
    return { error: NextResponse.json({ error: "Server configuration error" }, { status: 500 }) };
  }

  const { data: callerData, error: callerErr } = await admin.auth.getUser(token);
  if (callerErr || !callerData?.user) {
    return { error: NextResponse.json({ error: "Invalid session" }, { status: 401 }) };
  }

  const userId = String(callerData.user.id ?? "");

  const { data: memberRow, error: memberErr } = await admin
    .from("portal_members")
    .select("role,features")
    .eq("user_id", userId)
    .maybeSingle();

  if (memberErr) {
    const msg = String(memberErr.message ?? "");
    const code = String(memberErr.code ?? "");
    const missing =
      code === "42P01" || (msg.includes("portal_members") && msg.includes("does not exist"));
    if (missing) {
      const { data: legacyAdmin } = await admin
        .from("admin_users")
        .select("user_id")
        .eq("user_id", userId)
        .maybeSingle();
      if (!legacyAdmin) {
        return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
      }
      return { admin, userId, isAdmin: true };
    }
    return { error: NextResponse.json({ error: "Authorization error" }, { status: 500 }) };
  }

  if (!memberRow) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  const role = String(memberRow.role ?? "client").toLowerCase();
  if (role === "employer") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  const feats = parseFeatures(memberRow.features);
  const isAdmin = role === "admin" || role === "manager";
  const allowed = isAdmin || feats.includes("visitor_management");

  if (!allowed) {
    return {
      error: NextResponse.json({ error: "Forbidden: visitor_management feature required" }, { status: 403 }),
    };
  }

  return { admin, userId, isAdmin };
}
