import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type Body = {
  access_token?: string;
  email?: string;
  password?: string;
  make_admin?: boolean;
  email_confirm?: boolean;
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Body;
    const accessToken = String(body.access_token ?? "");
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    const makeAdmin = Boolean(body.make_admin);
    const emailConfirm = body.email_confirm !== false; // default true

    if (!accessToken) return NextResponse.json({ error: "Missing access_token" }, { status: 400 });
    if (!email) return NextResponse.json({ error: "Missing email" }, { status: 400 });
    if (!password || password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Authenticate caller from their access token.
    const { data: callerData, error: callerErr } = await admin.auth.getUser(accessToken);
    if (callerErr || !callerData?.user) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const callerId = String(callerData.user.id ?? "");
    if (!callerId) return NextResponse.json({ error: "Invalid caller" }, { status: 401 });

    // Require caller to already be an admin (from allowlist table).
    const { data: adminRow, error: adminErr } = await admin
      .from("admin_users")
      .select("user_id")
      .eq("user_id", callerId)
      .maybeSingle();

    if (adminErr) {
      return NextResponse.json({ error: adminErr.message ?? "Unable to verify admin access" }, { status: 500 });
    }
    if (!adminRow) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: emailConfirm,
    });

    if (error || !data?.user) {
      return NextResponse.json({ error: error?.message ?? "Failed to create user" }, { status: 400 });
    }

    if (makeAdmin) {
      const { error: insErr } = await admin.from("admin_users").insert({ user_id: data.user.id });
      if (insErr && String(insErr.code ?? "") !== "23505") {
        return NextResponse.json(
          { error: insErr.message ?? "User created, but failed to grant admin", user_id: data.user.id },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      ok: true,
      user_id: data.user.id,
      email: data.user.email,
      is_admin: makeAdmin,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

