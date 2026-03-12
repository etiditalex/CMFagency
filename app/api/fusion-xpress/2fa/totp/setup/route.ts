import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { generateSecret, generateURI } from "otplib";

const ISSUER = "Fusion Xpress";

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

    const userId = userData.user.id;
    const email = userData.user.email ?? "";
    const label = email || userId.slice(0, 8);

    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    const { data: pm } = await admin.from("portal_members").select("user_id").eq("user_id", userId).maybeSingle();
    const { data: legacy } = await admin.from("admin_users").select("user_id").eq("user_id", userId).maybeSingle();
    if (!pm && !legacy) return NextResponse.json({ error: "Not a portal member" }, { status: 403 });

    const secret = generateSecret({ length: 20 });
    const otpauthUrl = generateURI({ issuer: ISSUER, label, secret });

    await admin
      .from("portal_user_totp")
      .upsert({ user_id: userId, secret, verified_at: null }, { onConflict: "user_id" });

    return NextResponse.json({ otpauthUrl, secret });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
