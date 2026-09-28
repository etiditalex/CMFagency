import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const registrationId = new URL(req.url).searchParams.get("registration_id")?.trim() ?? "";
    if (!registrationId) return NextResponse.json({ error: "Missing registration." }, { status: 400 });

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data, error } = await admin
      .from("kenya_coast_models_registrations")
      .select("id, payment_status, payment_confirmed, mpesa_receipt, fee_kes, review_notes")
      .eq("id", registrationId)
      .maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: "Registration not found." }, { status: 404 });

    return NextResponse.json({
      registration_id: data.id,
      payment_status: data.payment_status,
      payment_confirmed: data.payment_confirmed,
      mpesa_receipt: data.mpesa_receipt,
      fee_kes: data.fee_kes,
      review_notes: data.review_notes,
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unexpected error" }, { status: 500 });
  }
}
