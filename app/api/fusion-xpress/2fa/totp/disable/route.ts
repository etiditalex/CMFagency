import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { requiresMandatoryBusinessTotp } from "@/lib/auth/business-totp";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace(/^Bearer\s+/i, "") ?? "";
    if (!token) return NextResponse.json({ error: "Missing authorization" }, { status: 401 });

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
    if (requiresMandatoryBusinessTotp(memberRow?.role, accountType)) {
      return NextResponse.json(
        { error: "Google Authenticator is required for business accounts and cannot be disabled." },
        { status: 403 }
      );
    }

    await admin.from("portal_user_totp").delete().eq("user_id", userId);

    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
