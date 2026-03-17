import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { generateSecret, generateURI } from "otplib";

const ISSUER = "Fusion Xpress";

/**
 * POST: Admin/manager sets up TOTP (Google Authenticator) for another user.
 * Returns otpauthUrl and secret so the admin can scan with their app and then sign in as that user with TOTP instead of email code.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId: targetUserId } = await params;
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace(/^Bearer\s+/i, "") ?? "";
    if (!token) return NextResponse.json({ error: "Missing authorization" }, { status: 401 });
    if (!targetUserId) return NextResponse.json({ error: "Missing user id" }, { status: 400 });

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) return NextResponse.json({ error: "Server configuration error" }, { status: 500 });

    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    const { data: callerData, error: callerErr } = await admin.auth.getUser(token);
    if (callerErr || !callerData?.user) return NextResponse.json({ error: "Invalid session" }, { status: 401 });

    const callerId = callerData.user.id;
    const { data: memberRow } = await admin.from("portal_members").select("role").eq("user_id", callerId).maybeSingle();
    const isAdmin = memberRow?.role === "admin" || memberRow?.role === "manager";
    const isLegacyAdmin = !memberRow
      ? (await admin.from("admin_users").select("user_id").eq("user_id", callerId).maybeSingle()).data != null
      : false;
    if (!isAdmin && !isLegacyAdmin) return NextResponse.json({ error: "Forbidden: admin or manager required" }, { status: 403 });

    const { data: targetUser } = await admin.auth.admin.getUserById(targetUserId);
    if (!targetUser?.user?.email) return NextResponse.json({ error: "Target user not found" }, { status: 404 });
    const label = targetUser.user.email || targetUserId.slice(0, 8);

    const secret = generateSecret({ length: 20 });
    const otpauthUrl = generateURI({ issuer: ISSUER, label, secret });

    await admin
      .from("portal_user_totp")
      .upsert({ user_id: targetUserId, secret, verified_at: null }, { onConflict: "user_id" });

    return NextResponse.json({ otpauthUrl, secret });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
