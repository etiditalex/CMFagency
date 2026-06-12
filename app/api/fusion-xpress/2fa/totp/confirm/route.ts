import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verify } from "otplib";

const COOKIE_NAME = "portal_2fa_verified";
const COOKIE_MAX_AGE = 60 * 60 * 24;

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace(/^Bearer\s+/i, "") ?? "";
    if (!token) return NextResponse.json({ error: "Missing authorization" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const code = typeof body.code === "string" ? body.code.trim().replace(/\D/g, "") : "";
    if (!code || code.length !== 6) return NextResponse.json({ error: "Enter the 6-digit code from your app" }, { status: 400 });

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !anonKey || !serviceKey) return NextResponse.json({ error: "Server configuration error" }, { status: 500 });

    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userData, error: userErr } = await authClient.auth.getUser(token);
    if (userErr || !userData?.user) return NextResponse.json({ error: "Invalid session" }, { status: 401 });

    const userId = userData.user.id;
    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const { data: totpRow, error: selectErr } = await admin
      .from("portal_user_totp")
      .select("secret")
      .eq("user_id", userId)
      .maybeSingle();

    if (selectErr || !totpRow?.secret) return NextResponse.json({ error: "Run setup first" }, { status: 400 });

    const result = await verify({ secret: totpRow.secret, token: code });
    if (!result.valid) return NextResponse.json({ error: "Invalid code" }, { status: 400 });

    await admin
      .from("portal_user_totp")
      .update({ verified_at: new Date().toISOString() })
      .eq("user_id", userId);

    const completeLogin = body.completeLogin === true;
    const res = NextResponse.json({ ok: true });
    if (completeLogin) {
      res.cookies.set(COOKIE_NAME, "1", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: COOKIE_MAX_AGE,
        path: "/",
      });
    }
    return res;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
