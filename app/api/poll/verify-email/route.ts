import { NextRequest, NextResponse } from "next/server";
import { findUserByEmail, pollAdmin, rateLimited } from "@/lib/poll/poll-account-admin";

export async function POST(req: NextRequest) {
  try {
    const limited = rateLimited(req);
    if (limited) return limited;

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    const email = String(body?.email ?? "").trim().toLowerCase();
    const code = String(body?.code ?? "").trim();
    if (!email.includes("@")) return NextResponse.json({ error: "Add a valid email." }, { status: 400 });
    if (!/^\d{6}$/.test(code)) return NextResponse.json({ error: "Enter the 6-digit code from your email." }, { status: 400 });

    const admin = pollAdmin();
    if (!admin) return NextResponse.json({ error: "Accounts are not connected yet." }, { status: 503 });

    const user = await findUserByEmail(admin, email);
    if (!user?.id) return NextResponse.json({ error: "No account found for this email." }, { status: 404 });

    const { data: member } = await admin.from("portal_members").select("role").eq("user_id", user.id).maybeSingle();
    if (String(member?.role ?? "") !== "poll") {
      return NextResponse.json({ error: "This verification is for poll accounts." }, { status: 403 });
    }

    const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
    if (meta.poll_email_verified === true) return NextResponse.json({ ok: true, alreadyVerified: true });

    const { data: codeRows } = await admin
      .from("portal_login_codes")
      .select("code, expires_at")
      .eq("user_id", user.id)
      .order("expires_at", { ascending: false })
      .limit(1);
    const row = codeRows?.[0];
    if (!row || row.code !== code) {
      return NextResponse.json({ error: "That code does not match. Check the email and try again." }, { status: 400 });
    }
    if (new Date(row.expires_at as string).getTime() < Date.now()) {
      return NextResponse.json({ error: "That code has expired. Send a new one." }, { status: 400 });
    }

    const { error: confirmErr } = await admin.auth.admin.updateUserById(user.id, {
      email_confirm: true,
      user_metadata: { ...meta, account_type: "poll", poll_email_verified: true },
    });
    if (confirmErr) return NextResponse.json({ error: confirmErr.message || "Could not verify the email." }, { status: 500 });

    await admin.from("portal_login_codes").delete().eq("user_id", user.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
