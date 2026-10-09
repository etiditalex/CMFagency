import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const COOKIE_NAME = "portal_2fa_verified";
const COOKIE_MAX_AGE = 60 * 60 * 24;

/** Marks a poll-account password login as allowed into the Poll dashboard page. */
export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
    if (!token) return NextResponse.json({ error: "Missing authorization" }, { status: 401 });

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !anonKey || !serviceKey || supabaseUrl.includes("placeholder.supabase.co")) {
      return NextResponse.json({ error: "Accounts are not connected yet." }, { status: 503 });
    }

    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userData, error: userErr } = await authClient.auth.getUser(token);
    if (userErr || !userData.user) return NextResponse.json({ error: "Invalid session" }, { status: 401 });

    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    const { data: member } = await admin.from("portal_members").select("role").eq("user_id", userData.user.id).maybeSingle();
    if (String(member?.role ?? "") !== "poll") {
      return NextResponse.json({ error: "This login is for poll accounts." }, { status: 403 });
    }
    const meta = (userData.user.user_metadata ?? {}) as Record<string, unknown>;
    if (meta.poll_email_verified === false) {
      return NextResponse.json({ error: "Verify your email before logging in. Enter the code from your inbox." }, { status: 403 });
    }

    const body = (await req.json().catch(() => ({}))) as { remember?: boolean };
    const res = NextResponse.json({ ok: true });
    res.cookies.set(COOKIE_NAME, "1", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      ...(body.remember === false ? {} : { maxAge: COOKIE_MAX_AGE }),
    });
    return res;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
