import { NextRequest, NextResponse } from "next/server";
import { sendPollVerificationEmail } from "@/lib/poll/send-poll-verification-email";
import { findUserByEmail, pollAdmin, rateLimited } from "@/lib/poll/poll-account-admin";

export async function POST(req: NextRequest) {
  try {
    const limited = rateLimited(req);
    if (limited) return limited;

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    const email = String(body?.email ?? "").trim().toLowerCase();
    if (!email.includes("@")) return NextResponse.json({ error: "Add a valid email." }, { status: 400 });

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

    const name = String(meta.name ?? "").trim();
    const emailResult = await sendPollVerificationEmail(admin, user.id, email, name);
    if ("error" in emailResult) {
      return NextResponse.json({ error: emailResult.error || "Could not send the verification email." }, { status: 503 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
