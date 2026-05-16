import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { sendVisitorLoginCodeEmail } from "@/lib/visitors/send-visitor-login-code";
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
    const email = String(body?.email ?? "")
      .trim()
      .toLowerCase();

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
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
      return NextResponse.json({ ok: true });
    }

    if (target.email_confirmed_at) {
      return NextResponse.json({ ok: true, alreadyVerified: true });
    }

    const { data: memberRow } = await admin
      .from("portal_members")
      .select("role, features")
      .eq("user_id", target.id)
      .maybeSingle();

    const features = Array.isArray(memberRow?.features) ? memberRow.features : [];
    const isVisitorAccount =
      memberRow?.role === "client" && features.length === 1 && features[0] === "visitor_management";

    if (!isVisitorAccount) {
      return NextResponse.json({ error: "No pending Visitor Management signup for this email" }, { status: 403 });
    }

    const emailResult = await sendVisitorLoginCodeEmail(admin, target.id, email, {
      subject: "Verify your Fusion Xpress Visitor Management email",
      headline: "Verify your email address",
      intro: "Enter this code on the verification page to activate your organization account:",
    });

    if ("error" in emailResult && emailResult.error) {
      return NextResponse.json({ error: emailResult.error }, { status: 502 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unexpected error" },
      { status: 500 }
    );
  }
}
