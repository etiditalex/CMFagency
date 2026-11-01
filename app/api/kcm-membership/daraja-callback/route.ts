import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { discardUnpaidKcmMembership } from "@/lib/kcm-unpaid-registration";
import { getStkMetadataItem } from "@/lib/daraja-stk-result";
import { querySafaricomStkCheckout, safaricomStkDecision, stkPaidAmountMatches } from "@/lib/daraja-stk-query";

type CallbackMetadataItem = { Name: string; Value: string | number };
type StkCallback = {
  MerchantRequestID?: string;
  CheckoutRequestID?: string;
  ResultCode?: string | number;
  ResultDesc?: string;
  CallbackMetadata?: { Item?: CallbackMetadataItem[] };
};

/** Safaricom may send Body/body and stkCallback with varying casing. */
function extractStkCallback(payload: unknown): StkCallback | null {
  if (!payload || typeof payload !== "object") return null;
  const p = payload as Record<string, unknown>;
  const body = (p.Body ?? p.body) as Record<string, unknown> | undefined;
  if (!body) return null;
  const stk = (body.stkCallback ?? body.StkCallback) as StkCallback | undefined;
  return stk && typeof stk === "object" ? stk : null;
}

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    let payload: unknown;
    try {
      payload = JSON.parse(rawBody) as unknown;
    } catch {
      return NextResponse.json({ ResultCode: 1, ResultDesc: "Invalid JSON" }, { status: 400 });
    }

    const stk = extractStkCallback(payload);
    const checkoutRaw = stk?.CheckoutRequestID;
    if (!stk || checkoutRaw === undefined || checkoutRaw === null) {
      return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" }, { status: 200 });
    }

    const checkoutId = String(checkoutRaw).trim();
    if (!checkoutId) {
      return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" }, { status: 200 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ ResultCode: 1, ResultDesc: "Server config error" }, { status: 500 });
    }

    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const { data: row } = await admin
      .from("kcm_memberships")
      .select("id,payment_status,payment_amount_kes")
      .eq("daraja_checkout_request_id", checkoutId)
      .maybeSingle();

    if (!row) {
      return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" }, { status: 200 });
    }

    if ((row as { payment_status?: string }).payment_status === "success") {
      return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" }, { status: 200 });
    }

    const confirmed = await querySafaricomStkCheckout(checkoutId);
    if (!confirmed.ok) {
      return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" }, { status: 200 });
    }

    const decision = safaricomStkDecision(confirmed.parsed);
    if (
      decision === "paid" &&
      stkPaidAmountMatches(confirmed.parsed.items, Number((row as { payment_amount_kes?: number }).payment_amount_kes))
    ) {
      const mpesaReceipt = String(getStkMetadataItem(confirmed.parsed.items, "MpesaReceiptNumber") ?? "").trim();
      await admin
        .from("kcm_memberships")
        .update({
          payment_status: "success",
          payment_confirmed: true,
          mpesa_receipt: mpesaReceipt || null,
          paid_at: new Date().toISOString(),
        })
        .eq("id", row.id);
      const { approvePaidKcmMembershipIfNeeded } = await import("@/lib/kcm-membership-approve");
      await approvePaidKcmMembershipIfNeeded(admin, String((row as { id: string }).id)).catch(() => null);
      return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" }, { status: 200 });
    }

    if (decision === "failed") {
      await discardUnpaidKcmMembership(admin, String((row as { id: string }).id));
    }

    return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" }, { status: 200 });
  } catch {
    return NextResponse.json({ ResultCode: 1, ResultDesc: "Server error" }, { status: 500 });
  }
}
