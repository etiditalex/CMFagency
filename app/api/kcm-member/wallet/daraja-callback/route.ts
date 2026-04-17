import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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

function isStkSuccessResult(resultCode: unknown, items: CallbackMetadataItem[]): boolean {
  const receipt = items.find((i) => String(i.Name) === "MpesaReceiptNumber")?.Value;
  if (receipt !== undefined && receipt !== null && String(receipt).trim() !== "") return true;
  if (resultCode === undefined || resultCode === null) return false;
  const s = String(resultCode).trim();
  if (s === "0" || s === "00") return true;
  const n = Number(resultCode);
  return Number.isFinite(n) && n === 0;
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
      .select("id,status")
      .eq("daraja_checkout_request_id", checkoutId)
      .maybeSingle();
    if (!txRow) return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" }, { status: 200 });

    const items = stk.CallbackMetadata?.Item ?? [];
    const findItem = (name: string) => items.find((i) => String(i.Name) === name)?.Value;
    const mpesaReceipt = String(findItem("MpesaReceiptNumber") ?? "").trim();
    const resultDesc = String(stk.ResultDesc ?? "").trim();
    const success = isStkSuccessResult(stk.ResultCode, items);

    if (success) {
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

    if (String((txRow as { status?: string }).status ?? "") !== "success") {
      const failure =
        resultDesc ||
        (stk.ResultCode !== undefined && stk.ResultCode !== null ? `M-Pesa result code ${String(stk.ResultCode)}` : "Payment not completed");
      await admin
        .from("kcm_member_wallet_transactions")
        .update({
          status: "failed",
          failure_reason: failure.slice(0, 1000),
        })
        .eq("id", String((txRow as { id: string }).id));
    }

    return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" }, { status: 200 });
  } catch (e: unknown) {
    return NextResponse.json(
      { ResultCode: 1, ResultDesc: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}
