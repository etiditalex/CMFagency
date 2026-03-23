import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { checkEmployerRegisterRateLimit, getClientIp } from "@/lib/rate-limit";

/**
 * Self-serve employer signup: Supabase auth user + portal_members.role = employer.
 * After signup, user signs in on /jobs under “For employers”; email 2FA uses Resend via /api/fusion-xpress/send-login-code.
 */
export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const { allowed, retryAfter } = checkEmployerRegisterRateLimit(ip);
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many registration attempts. Try again later.", retryAfter },
        { status: 429, headers: { "Retry-After": String(retryAfter ?? 3600) } }
      );
    }

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

    const email = String(body.email ?? "")
      .trim()
      .toLowerCase();
    const password = String(body.password ?? "");
    const company_name = String(body.company_name ?? "").trim();
    const contact_name = String(body.contact_name ?? "").trim();

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Valid work email is required" }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }
    if (!company_name) {
      return NextResponse.json({ error: "Company or organisation name is required" }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const displayName = contact_name || company_name;
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name: displayName,
        company_name,
        account_type: "employer",
      },
    });

    if (createErr || !created?.user?.id) {
      const msg = createErr?.message ?? "Could not create account";
      const lower = msg.toLowerCase();
      if (lower.includes("already") || lower.includes("registered") || lower.includes("exists")) {
        return NextResponse.json({ error: "An account with this email already exists. Sign in instead." }, { status: 400 });
      }
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const userId = created.user.id;

    const { error: pmErr } = await admin.from("portal_members").insert({
      user_id: userId,
      role: "employer",
      tier: "basic",
      features: [],
    });

    if (pmErr) {
      await admin.auth.admin.deleteUser(userId).catch(() => {});
      if (/duplicate|unique/i.test(pmErr.message)) {
        return NextResponse.json({ error: "This account is already registered." }, { status: 400 });
      }
      return NextResponse.json({ error: pmErr.message ?? "Could not complete hiring account setup" }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      message: "Your hiring account is ready. Sign in at the employer portal link below.",
    });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unexpected error" },
      { status: 500 }
    );
  }
}
