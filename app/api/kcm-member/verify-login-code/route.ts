import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { KCM_MEMBER_COOKIE, KCM_SESSION_DAYS, getKcmAdminClient } from "@/lib/kcm-member-auth";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as { email?: string; code?: string };
    const email = String(body.email ?? "").trim().toLowerCase();
    const code = String(body.code ?? "").trim().replace(/\D/g, "").slice(0, 6);
    if (!email || !code || code.length !== 6) {
      return NextResponse.json({ error: "Email and 6-digit code are required." }, { status: 400 });
    }

    const admin = getKcmAdminClient();
    if (!admin) return NextResponse.json({ error: "Server configuration error." }, { status: 500 });

    const { data: codeRow, error: codeErr } = await admin
      .from("kcm_member_login_codes")
      .select("id,membership_id,expires_at")
      .eq("email", email)
      .eq("code", code)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (codeErr) return NextResponse.json({ error: codeErr.message }, { status: 500 });
    if (!codeRow) return NextResponse.json({ error: "Invalid code." }, { status: 400 });

    const expires = new Date(String((codeRow as { expires_at?: string }).expires_at ?? ""));
    if (!Number.isFinite(expires.getTime()) || expires <= new Date()) {
      return NextResponse.json({ error: "Code expired. Request a new one." }, { status: 400 });
    }

    const membershipId = String((codeRow as { membership_id: string }).membership_id);
    const sessionToken = crypto.randomBytes(32).toString("hex");
    const sessionExpiresAt = new Date(Date.now() + KCM_SESSION_DAYS * 24 * 60 * 60 * 1000);

    await admin.from("kcm_member_login_codes").delete().eq("email", email);
    await admin.from("kcm_member_sessions").delete().eq("email", email);

    const { error: insertSessionErr } = await admin.from("kcm_member_sessions").insert({
      membership_id: membershipId,
      email,
      session_token: sessionToken,
      expires_at: sessionExpiresAt.toISOString(),
    });
    if (insertSessionErr) return NextResponse.json({ error: insertSessionErr.message }, { status: 500 });

    const response = NextResponse.json({ ok: true });
    response.cookies.set(KCM_MEMBER_COOKIE, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires: sessionExpiresAt,
    });
    return response;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
