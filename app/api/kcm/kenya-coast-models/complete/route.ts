import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  formatForumFeeKes,
  KCM_FORUM_EVENT_LABEL,
  KCM_FORUM_TIME_LABEL,
  KCM_FORUM_VENUE,
} from "@/lib/kenya-coast-models";
import { fromEmail, resend } from "@/lib/resend";
import { ensureForumMembership } from "@/lib/kenya-coast-models-membership";
import { escapeHtml } from "@/lib/sanitize";

export const dynamic = "force-dynamic";

type Row = {
  id: string;
  full_name: string;
  email: string | null;
  fee_kes: number;
  payment_status: string;
  payment_confirmed: boolean;
  mpesa_receipt: string | null;
  details_confirmed: boolean;
  attendee_type: string;
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as { registrationId?: string; confirmed?: boolean };
    const registrationId = String(body.registrationId ?? "").trim();
    if (!registrationId || body.confirmed !== true) {
      return NextResponse.json({ error: "Confirm that your details are accurate and the fee is paid." }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: "Registration is not available yet." }, { status: 500 });
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data, error } = await admin
      .from("kenya_coast_models_registrations")
      .select("id, full_name, email, fee_kes, payment_status, payment_confirmed, mpesa_receipt, details_confirmed, attendee_type")
      .eq("id", registrationId)
      .maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: "Registration not found." }, { status: 404 });

    const row = data as Row;
    if (row.payment_status !== "success" || !row.payment_confirmed) {
      return NextResponse.json({ error: "Complete the M-Pesa prompt before finishing registration." }, { status: 400 });
    }

    await ensureForumMembership(admin, row.id);

    if (!row.details_confirmed) {
      const { error: updateErr } = await admin
        .from("kenya_coast_models_registrations")
        .update({ details_confirmed: true })
        .eq("id", row.id);
      if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    if (resend && row.email) {
      const safeName = escapeHtml(row.full_name);
      const fee = escapeHtml(formatForumFeeKes(row.fee_kes));
      const receipt = escapeHtml(row.mpesa_receipt || "Pending receipt");
      await resend.emails
        .send({
          from: fromEmail,
          to: [row.email],
          subject: "Kenya Coast Models forum registration",
          html: `<p>Hello ${safeName},</p>
<p>Your attendance registration for the Sustainable Fashion &amp; Models Empowerment Forum is complete.</p>
<p><strong>Date:</strong> ${KCM_FORUM_EVENT_LABEL}<br>
<strong>Time:</strong> ${KCM_FORUM_TIME_LABEL}<br>
<strong>Venue:</strong> ${escapeHtml(KCM_FORUM_VENUE)}<br>
<strong>Fee paid:</strong> ${fee}<br>
<strong>M-Pesa receipt:</strong> ${receipt}</p>
<p>Presented by Changer Fusions for Kenya-Coast Models.</p>`,
        })
        .catch((emailError: unknown) => {
          console.error("kenya coast models email:", emailError);
        });
    }

    return NextResponse.json({
      ok: true,
      fullName: row.full_name,
      feeKes: row.fee_kes,
      receipt: row.mpesa_receipt,
      emailedTo: row.email,
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unexpected error" }, { status: 500 });
  }
}
