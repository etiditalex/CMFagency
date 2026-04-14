import { NextRequest, NextResponse } from "next/server";
import { resend, fromEmail } from "@/lib/resend";
import { getKcmAdminClient } from "@/lib/kcm-member-auth";

const CODE_EXPIRY_MINUTES = 10;

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as { email?: string };
    const email = String(body.email ?? "").trim().toLowerCase();
    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email is required." }, { status: 400 });
    }
    if (!resend) {
      return NextResponse.json({ error: "Email service is not configured." }, { status: 503 });
    }

    const admin = getKcmAdminClient();
    if (!admin) return NextResponse.json({ error: "Server configuration error." }, { status: 500 });

    const { data: membership, error: membershipErr } = await admin
      .from("kcm_memberships")
      .select("id,first_name,payment_status,payment_confirmed")
      .eq("email", email)
      .eq("payment_status", "success")
      .eq("payment_confirmed", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (membershipErr) return NextResponse.json({ error: membershipErr.message }, { status: 500 });
    if (!membership) {
      return NextResponse.json(
        { error: "No active paid KCM membership found for this email." },
        { status: 404 }
      );
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + CODE_EXPIRY_MINUTES * 60 * 1000);

    await admin.from("kcm_member_login_codes").delete().eq("email", email);
    const { error: insertErr } = await admin.from("kcm_member_login_codes").insert({
      membership_id: String((membership as { id: string }).id),
      email,
      code,
      expires_at: expiresAt.toISOString(),
    });
    if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });

    await resend.emails.send({
      from: fromEmail,
      to: email,
      subject: "Your KCM member login code",
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827;">
          <h2 style="margin:0 0 12px;">Kenya Coast Models login code</h2>
          <p>Hello ${String((membership as { first_name?: string }).first_name ?? "Member")},</p>
          <p>Use this code to verify your login and access your KCM profile:</p>
          <div style="margin:16px 0;padding:14px;border:1px solid #d1d5db;border-radius:10px;font-size:30px;font-weight:700;letter-spacing:6px;text-align:center;">
            ${code}
          </div>
          <p>This code expires in ${CODE_EXPIRY_MINUTES} minutes.</p>
          <p style="font-size:12px;color:#6b7280;">Changer Fusions - Kenya Coast Models</p>
        </div>
      `,
    });

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
