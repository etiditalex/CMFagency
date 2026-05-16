import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { checkEmployerRegisterRateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const { allowed, retryAfter } = checkEmployerRegisterRateLimit(ip);
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many attempts. Try again later.", retryAfter },
        { status: 429, headers: { "Retry-After": String(retryAfter ?? 3600) } }
      );
    }

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

    const email = String(body.email ?? "")
      .trim()
      .toLowerCase();
    const code = String(body.code ?? "").trim();

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
    }
    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json({ error: "Enter the 6-digit code from your email" }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: listData } = await admin.auth.admin.listUsers({ perPage: 1000 });
    const target = (listData?.users ?? []).find((u) => u.email?.toLowerCase() === email);
    if (!target?.id) {
      return NextResponse.json({ error: "No account found for this email" }, { status: 404 });
    }

    const userId = target.id;

    const { data: memberRow } = await admin
      .from("portal_members")
      .select("role, features")
      .eq("user_id", userId)
      .maybeSingle();

    const features = Array.isArray(memberRow?.features) ? memberRow.features : [];
    const isVisitorAccount =
      memberRow?.role === "client" && features.length === 1 && features[0] === "visitor_management";

    if (!isVisitorAccount) {
      return NextResponse.json({ error: "This verification is for Visitor Management accounts only" }, { status: 403 });
    }

    if (target.email_confirmed_at) {
      return NextResponse.json({ ok: true, alreadyVerified: true });
    }

    const { data: codeRows } = await admin
      .from("portal_login_codes")
      .select("id, code, expires_at")
      .eq("user_id", userId)
      .order("expires_at", { ascending: false })
      .limit(1);

    const row = codeRows?.[0];
    if (!row || row.code !== code) {
      return NextResponse.json({ error: "Invalid or expired verification code" }, { status: 400 });
    }
    if (new Date(row.expires_at as string).getTime() < Date.now()) {
      return NextResponse.json({ error: "Verification code has expired. Request a new one." }, { status: 400 });
    }

    const { error: confirmErr } = await admin.auth.admin.updateUserById(userId, {
      email_confirm: true,
    });
    if (confirmErr) {
      return NextResponse.json({ error: confirmErr.message }, { status: 500 });
    }

    await admin.from("portal_login_codes").delete().eq("user_id", userId);

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unexpected error" },
      { status: 500 }
    );
  }
}
