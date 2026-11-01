import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { ensureForumMembership } from "@/lib/kenya-coast-models-membership";
import { discardUnpaidForumRegistration } from "@/lib/kcm-unpaid-registration";
import { getStkMetadataItem } from "@/lib/daraja-stk-result";
import { querySafaricomStkCheckout, safaricomStkDecision, stkPaidAmountMatches } from "@/lib/daraja-stk-query";

type CallbackMetadataItem = { Name: string; Value: string | number };
type StkCallback = {
  CheckoutRequestID?: string;
  ResultCode?: string | number;
  ResultDesc?: string;
  CallbackMetadata?: { Item?: CallbackMetadataItem[] };
};

function extractStkCallback(payload: unknown): StkCallback | null {
  if (!payload || typeof payload !== "object") return null;
  const body = ((payload as Record<string, unknown>).Body ?? (payload as Record<string, unknown>).body) as
    | Record<string, unknown>
    | undefined;
  if (!body) return null;
  const stk = (body.stkCallback ?? body.StkCallback) as StkCallback | undefined;
  return stk && typeof stk === "object" ? stk : null;
}

export async function POST(req: Request) {
  try {
    const payload = JSON.parse(await req.text()) as unknown;
    const stk = extractStkCallback(payload);
    const checkoutId = String(stk?.CheckoutRequestID ?? "").trim();
    if (!checkoutId) return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ ResultCode: 1, ResultDesc: "Server config error" }, { status: 500 });
    }

    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    const { data: row } = await admin
      .from("kenya_coast_models_registrations")
      .select("id, payment_status, fee_kes")
      .eq("daraja_checkout_request_id", checkoutId)
      .maybeSingle();
    if (!row) return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });

    if ((row as { payment_status?: string }).payment_status === "success") {
      return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
    }

    const confirmed = await querySafaricomStkCheckout(checkoutId);
    if (!confirmed.ok) return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });

    const decision = safaricomStkDecision(confirmed.parsed);
    if (
      decision === "paid" &&
      stkPaidAmountMatches(confirmed.parsed.items, Number((row as { fee_kes?: number }).fee_kes))
    ) {
      const receipt = String(getStkMetadataItem(confirmed.parsed.items, "MpesaReceiptNumber") ?? "").trim();
      await admin
        .from("kenya_coast_models_registrations")
        .update({
          payment_status: "success",
          payment_confirmed: true,
          mpesa_receipt: receipt || null,
          paid_at: new Date().toISOString(),
        })
        .eq("id", row.id);
      await ensureForumMembership(admin, String((row as { id: string }).id));
      return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
    }

    if (decision === "failed") {
      await discardUnpaidForumRegistration(admin, String((row as { id: string }).id));
    }
    return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
  } catch {
    return NextResponse.json({ ResultCode: 1, ResultDesc: "Server error" }, { status: 500 });
  }
}
