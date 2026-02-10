import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function parseCsv(input: string | undefined | null) {
  return String(input ?? "")
    .split(",")
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean);
}

export async function POST(req: NextRequest) {
  try {
    const { access_token } = (await req.json()) as { access_token?: string };
    if (!access_token) {
      return NextResponse.json({ error: "Missing access_token" }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const adminEmails = parseCsv(process.env.FUSION_XPRESS_ADMIN_EMAILS);

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    // If no allowlist configured, do nothing (keeps current security model).
    if (adminEmails.length === 0) {
      return NextResponse.json({ ok: true, claimed: false, reason: "no_allowlist_configured" });
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: userData, error: userErr } = await admin.auth.getUser(access_token);
    if (userErr || !userData?.user) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const user = userData.user;
    const email = String(user.email ?? "").toLowerCase();
    const userId = String(user.id ?? "");

    if (!email || !userId) {
      return NextResponse.json({ error: "Invalid user" }, { status: 400 });
    }

    if (!adminEmails.includes(email)) {
      return NextResponse.json({ ok: true, claimed: false, reason: "not_allowlisted" });
    }

    // Add to allowlist table (idempotent).
    const { error: insertErr } = await admin.from("admin_users").insert({ user_id: userId });
    if (insertErr) {
      // If already exists, treat as ok.
      if (String(insertErr.code ?? "") === "23505") {
        return NextResponse.json({ ok: true, claimed: true, already: true });
      }
      return NextResponse.json(
        { error: insertErr.message ?? "Failed to claim admin access", code: insertErr.code ?? null },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, claimed: true, already: false });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

