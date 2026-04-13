import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type CallbackMetadataItem = { Name: string; Value: string | number };
type StkCallback = {
  CheckoutRequestID?: string;
  ResultCode?: number;
  ResultDesc?: string;
  CallbackMetadata?: { Item?: CallbackMetadataItem[] };
};
type DarajaCallbackBody = { Body?: { stkCallback?: StkCallback } };

export async function POST(req: Request) {
  try {
    const payload = (await req.json().catch(() => ({}))) as DarajaCallbackBody;
    const stk = payload.Body?.stkCallback;
    if (!stk?.CheckoutRequestID) {
      return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" }, { status: 200 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ ResultCode: 1, ResultDesc: "Server config error" }, { status: 500 });
    }

    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    const checkoutId = String(stk.CheckoutRequestID);
    const resultCode = Number(stk.ResultCode ?? -1);
    const resultDesc = String(stk.ResultDesc ?? "");

    const { data: row } = await admin
      .from("kcm_memberships")
      .select("id")
      .eq("daraja_checkout_request_id", checkoutId)
      .maybeSingle();

    if (!row) return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" }, { status: 200 });

    if (resultCode !== 0) {
      await admin
        .from("kcm_memberships")
        .update({
          payment_status: "failed",
          payment_confirmed: false,
          review_notes: resultDesc || `M-Pesa result code ${resultCode}`,
        })
        .eq("id", row.id);
      return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" }, { status: 200 });
    }

    const items = stk.CallbackMetadata?.Item ?? [];
    const findItem = (name: string) => items.find((i) => i.Name === name)?.Value;
    const mpesaReceipt = String(findItem("MpesaReceiptNumber") ?? "");

    await admin
      .from("kcm_memberships")
      .update({
        payment_status: "success",
        payment_confirmed: true,
        mpesa_receipt: mpesaReceipt || null,
        paid_at: new Date().toISOString(),
      })
      .eq("id", row.id);

    return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" }, { status: 200 });
  } catch (e: unknown) {
    return NextResponse.json(
      { ResultCode: 1, ResultDesc: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}
