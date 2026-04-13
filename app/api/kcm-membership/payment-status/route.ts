import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: NextRequest) {
  try {
    const membershipId = new URL(req.url).searchParams.get("membership_id")?.trim() ?? "";
    if (!membershipId) return NextResponse.json({ error: "Missing membership_id." }, { status: 400 });

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data, error } = await admin
      .from("kcm_memberships")
      .select("id,payment_status,payment_confirmed,mpesa_receipt,paid_at")
      .eq("id", membershipId)
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: "Membership not found." }, { status: 404 });

    return NextResponse.json({
      membership_id: data.id,
      payment_status: data.payment_status,
      payment_confirmed: data.payment_confirmed,
      mpesa_receipt: data.mpesa_receipt,
      paid_at: data.paid_at,
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unexpected error" }, { status: 500 });
  }
}
