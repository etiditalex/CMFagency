import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
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
    const checkoutId = String(stk?.CheckoutRequestID ?? "").trim();
    if (!stk || !checkoutId) return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" }, { status: 200 });

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ ResultCode: 1, ResultDesc: "Server config error" }, { status: 500 });
    }

    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    const { data: txRow } = await admin
      .from("kcm_member_wallet_transactions")
      .select("id,status,amount_kes")
      .eq("daraja_checkout_request_id", checkoutId)
      .maybeSingle();
    if (!txRow) return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" }, { status: 200 });

    if (String((txRow as { status?: string }).status ?? "") === "success") {
      return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" }, { status: 200 });
    }

    const confirmed = await querySafaricomStkCheckout(checkoutId);
    if (!confirmed.ok) return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" }, { status: 200 });

    const decision = safaricomStkDecision(confirmed.parsed);
    if (
      decision === "paid" &&
      stkPaidAmountMatches(confirmed.parsed.items, Number((txRow as { amount_kes?: number }).amount_kes))
    ) {
      const mpesaReceipt = String(getStkMetadataItem(confirmed.parsed.items, "MpesaReceiptNumber") ?? "").trim();
      await admin
        .from("kcm_member_wallet_transactions")
        .update({
          status: "success",
          mpesa_receipt: mpesaReceipt || null,
          paid_at: new Date().toISOString(),
          failure_reason: null,
        })
        .eq("id", String((txRow as { id: string }).id));
      return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" }, { status: 200 });
    }

    if (decision === "failed") {
      const failure = confirmed.parsed.resultDesc || `M-Pesa result code ${confirmed.parsed.resultCode}`;
      await admin
        .from("kcm_member_wallet_transactions")
        .update({
          status: "failed",
          failure_reason: failure.slice(0, 1000),
        })
        .eq("id", String((txRow as { id: string }).id));
    }

    return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" }, { status: 200 });
  } catch {
    return NextResponse.json({ ResultCode: 1, ResultDesc: "Server error" }, { status: 500 });
  }
}
