import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendPollVerificationEmail } from "@/lib/poll/send-poll-verification-email";
import { checkPollRegisterRateLimit, getClientIp } from "@/lib/rate-limit";

/** Self-serve poll account: Supabase user plus portal_members.role = poll. */
export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const { allowed, retryAfter } = checkPollRegisterRateLimit(ip);
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many registration attempts. Try again later.", retryAfter },
        { status: 429, headers: { "Retry-After": String(retryAfter ?? 3600) } },
      );
    }

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

    const name = String(body.name ?? "").trim().slice(0, 80);
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");

    if (name.length < 2) return NextResponse.json({ error: "Add your name." }, { status: 400 });
    if (!email.includes("@")) return NextResponse.json({ error: "Add a valid email." }, { status: 400 });
    if (password.length < 6) return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !anonKey || !serviceKey || supabaseUrl.includes("placeholder.supabase.co")) {
      return NextResponse.json({ error: "Accounts are not connected yet." }, { status: 503 });
    }

    const signup = createClient(supabaseUrl, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: created, error: createErr } = await signup.auth.signUp({
      email,
      password,
      options: { data: { name, account_type: "poll", poll_email_verified: false } },
    });

    const userId = created.user?.id;
    if (createErr && !userId) {
      const msg = createErr.message;
      if (/already|registered|exists/i.test(msg)) {
        return NextResponse.json({ error: "An account with this email already exists. Log in instead." }, { status: 400 });
      }
      return NextResponse.json({ error: msg || "Could not create account" }, { status: 400 });
    }
    if (!userId || (created.user?.identities?.length ?? 0) === 0) {
      return NextResponse.json({ error: "An account with this email already exists. Log in instead." }, { status: 400 });
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { error: confirmErr } = await admin.auth.admin.updateUserById(userId, {
      user_metadata: { name, account_type: "poll", poll_email_verified: false },
    });
    if (confirmErr) {
      await admin.auth.admin.deleteUser(userId).catch(() => undefined);
      return NextResponse.json({ error: confirmErr.message || "Could not finish the account." }, { status: 500 });
    }
    const { error: memberErr } = await admin.from("portal_members").insert({
      user_id: userId,
      role: "poll",
      tier: "basic",
      features: [],
    });

    if (memberErr) {
      await admin.auth.admin.deleteUser(userId).catch(() => undefined);
      if (/check constraint|portal_members_role/i.test(memberErr.message)) {
        return NextResponse.json(
          { error: "Poll accounts need database/ticketing_voting_mvp_patch_99_portal_poll_role.sql in the Supabase SQL editor." },
          { status: 500 },
        );
      }
      return NextResponse.json({ error: memberErr.message || "Could not finish the account." }, { status: 500 });
    }

    const emailResult = await sendPollVerificationEmail(admin, userId, email, name);
    if ("error" in emailResult) {
      return NextResponse.json(
        {
          ok: true,
          verificationRequired: true,
          emailWarning: "Account created, but the verification email could not be sent. Use the resend option on the signup page.",
        },
        { status: 201 },
      );
    }

    return NextResponse.json({ ok: true, verificationRequired: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
