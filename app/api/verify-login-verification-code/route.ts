import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { checkLoginRateLimit, getClientIp } from "@/lib/rate-limit";

const COOKIE_NAME = "login_verified";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const { allowed, retryAfter } = checkLoginRateLimit(ip);
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many attempts. Please try again later.", retryAfter },
        { status: 429, headers: { "Retry-After": String(retryAfter ?? 900) } }
      );
    }

    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace(/^Bearer\s+/i, "")?.trim();
    if (!token) return NextResponse.json({ error: "Missing authorization" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const code = typeof body.code === "string" ? body.code.trim().replace(/\D/g, "").slice(0, 6) : "";
    if (!code || code.length !== 6)
      return NextResponse.json({ error: "Invalid code" }, { status: 400 });

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !anonKey || !serviceKey)
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });

    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userData, error: userErr } = await authClient.auth.getUser(token);
    if (userErr || !userData?.user)
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });

    const userId = userData.user.id;
    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    const { data: rows, error: selectErr } = await admin
      .from("site_login_codes")
      .select("id")
      .eq("user_id", userId)
      .eq("code", code)
      .gte("expires_at", new Date().toISOString());

    if (selectErr) {
      // Surface the real underlying error (RLS/permissions/etc.) to debug verification failures.
      return NextResponse.json(
        { error: selectErr.message ?? "Failed to verify code" },
        { status: 500 }
      );
    }

    if (!rows?.length) {
      return NextResponse.json({ error: "Invalid or expired code" }, { status: 400 });
    }

    await admin.from("site_login_codes").delete().eq("id", rows[0].id);

    const res = NextResponse.json({ success: true });
    res.cookies.set(COOKIE_NAME, "1", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: COOKIE_MAX_AGE,
    });
    return res;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
