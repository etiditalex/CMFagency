import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { hash } from "bcryptjs";
import { attachAccountService, isDuplicateAuthError } from "@/lib/auth/attach-account-service";
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
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey || supabaseUrl.includes("placeholder.supabase.co")) {
      return NextResponse.json({ error: "Accounts are not connected yet." }, { status: 503 });
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    // Hash first so Supabase stores the password without applying its character-class rule.
    const passwordHash = await hash(password, 10);
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password_hash: passwordHash,
      email_confirm: false,
      user_metadata: { name, account_type: "poll", poll_email_verified: false },
    });

    let userId = created.user?.id ?? "";
    let addedToExisting = false;
    let emailConfirmed = false;
    if (createErr || !userId) {
      const msg = createErr?.message ?? "Could not create account";
      if (!isDuplicateAuthError(msg)) {
        return NextResponse.json({ error: "Could not create account" }, { status: 400 });
      }
      const attached = await attachAccountService(admin, email, password, "poll", { name });
      if (!attached.ok) return NextResponse.json({ error: attached.error }, { status: attached.status });
      userId = attached.userId;
      addedToExisting = true;
      emailConfirmed = attached.emailConfirmed;
    } else {
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
    }

    if (addedToExisting && emailConfirmed) {
      return NextResponse.json({
        ok: true,
        addedToExisting: true,
        verificationRequired: false,
        message: "Poll was added to your existing account. Sign in with your current password.",
      });
    }

    if (addedToExisting) {
      const { data: existing } = await admin.auth.admin.getUserById(userId);
      const meta = (existing.user?.user_metadata ?? {}) as Record<string, unknown>;
      await admin.auth.admin.updateUserById(userId, {
        user_metadata: { ...meta, poll_email_verified: false },
      });
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
