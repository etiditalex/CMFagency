import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verify } from "otplib";

/**
 * POST: Admin/manager confirms TOTP for another user (body: { code }).
 * Verifies the 6-digit code and marks TOTP as enabled for that user.
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

    const body = await req.json().catch(() => ({}));
    const code = typeof body.code === "string" ? body.code.trim().replace(/\D/g, "") : "";
    if (!code || code.length !== 6) return NextResponse.json({ error: "Enter the 6-digit code from your app" }, { status: 400 });

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

    const { data: totpRow, error: selectErr } = await admin
      .from("portal_user_totp")
      .select("secret")
      .eq("user_id", targetUserId)
      .maybeSingle();

    if (selectErr || !totpRow?.secret) return NextResponse.json({ error: "Run setup first for this user" }, { status: 400 });

    const result = await verify({ secret: totpRow.secret, token: code });
    if (!result.valid) return NextResponse.json({ error: "Invalid code" }, { status: 400 });

    await admin
      .from("portal_user_totp")
      .update({ verified_at: new Date().toISOString() })
      .eq("user_id", targetUserId);

    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
