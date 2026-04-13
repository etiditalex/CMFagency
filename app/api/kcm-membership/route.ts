import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type Body = {
  membership_id?: string;
  top_model_interest?: boolean;
};

export async function POST(req: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    const body = (await req.json().catch(() => ({}))) as Body;
    const membershipId = String(body.membership_id ?? "").trim();
    const topModelInterest = Boolean(body.top_model_interest);

    if (!membershipId) {
      return NextResponse.json({ error: "Missing membership_id." }, { status: 400 });
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: row, error: lookupErr } = await admin
      .from("kcm_memberships")
      .select("id,payment_status")
      .eq("id", membershipId)
      .maybeSingle();

    if (lookupErr) return NextResponse.json({ error: lookupErr.message }, { status: 500 });
    if (!row) return NextResponse.json({ error: "Membership record not found." }, { status: 404 });
    if (String((row as { payment_status?: string }).payment_status ?? "") !== "success") {
      return NextResponse.json({ error: "Payment is not completed yet." }, { status: 400 });
    }

    const { error } = await admin
      .from("kcm_memberships")
      .update({
        top_model_interest: topModelInterest,
        status: "new",
        updated_at: new Date().toISOString(),
      })
      .eq("id", membershipId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
