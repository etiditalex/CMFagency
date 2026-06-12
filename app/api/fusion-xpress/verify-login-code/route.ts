import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verify } from "otplib";

import { requiresMandatoryBusinessTotp } from "@/lib/auth/business-totp";

const COOKIE_NAME = "portal_2fa_verified";
const COOKIE_MAX_AGE = 60 * 60 * 24; // 24 hours

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace(/^Bearer\s+/i, "") ?? "";
    if (!token) return NextResponse.json({ error: "Missing authorization" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const code = typeof body.code === "string" ? body.code.trim().replace(/\D/g, "").slice(0, 6) : "";
    const method = (body.method === "totp" ? "totp" : "email") as "email" | "totp";
    if (!code || code.length !== 6) return NextResponse.json({ error: "Invalid code" }, { status: 400 });

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !anonKey || !serviceKey) return NextResponse.json({ error: "Server configuration error" }, { status: 500 });

    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userData, error: userErr } = await authClient.auth.getUser(token);
    if (userErr || !userData?.user) return NextResponse.json({ error: "Invalid session" }, { status: 401 });

    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    const userId = userData.user.id;

    const { data: memberRow } = await admin
      .from("portal_members")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle();
    const meta = userData.user.user_metadata as Record<string, unknown> | undefined;
    const accountType = String(meta?.account_type ?? meta?.accountType ?? "").trim();
    const totpRequired = requiresMandatoryBusinessTotp(memberRow?.role, accountType);

    if (method === "email" && totpRequired) {
      const { data: totpRow } = await admin
        .from("portal_user_totp")
        .select("user_id")
        .eq("user_id", userId)
        .not("verified_at", "is", null)
        .maybeSingle();
      if (totpRow) {
        return NextResponse.json(
          { error: "Business accounts must sign in with Google Authenticator." },
          { status: 400 }
        );
      }
    }

    if (method === "totp") {
      const { data: totpRow, error: totpErr } = await admin
        .from("portal_user_totp")
        .select("secret")
        .eq("user_id", userId)
        .not("verified_at", "is", null)
        .maybeSingle();
      if (totpErr || !totpRow?.secret) return NextResponse.json({ error: "Authenticator not set up" }, { status: 400 });
      const result = await verify({ secret: totpRow.secret, token: code });
      if (!result.valid) return NextResponse.json({ error: "Invalid code" }, { status: 400 });
    } else {
      const { data: rows, error: selectErr } = await admin
        .from("portal_login_codes")
        .select("id")
        .eq("user_id", userId)
        .eq("code", code)
        .gt("expires_at", new Date().toISOString())
        .limit(1);
      if (selectErr || !rows?.length) return NextResponse.json({ error: "Invalid or expired code" }, { status: 400 });
      await admin.from("portal_login_codes").delete().eq("id", rows[0].id);
    }

    const res = NextResponse.json({ ok: true });
    res.cookies.set(COOKIE_NAME, "1", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: COOKIE_MAX_AGE,
      path: "/",
    });
    return res;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
