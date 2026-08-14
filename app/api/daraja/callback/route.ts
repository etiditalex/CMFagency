import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { notifyCampaignOwnerPaymentIncomplete } from "@/lib/notify-campaign-owner-payment-incomplete";
import { sendPurchaseReminderByRef } from "@/lib/send-purchase-reminder";
import { finalizeDarajaStkFromMetadataItems } from "@/lib/daraja-finalize-stk-from-items";
import { findDarajaTransactionForStkCallback } from "@/lib/daraja-callback-lookup";
import { isStkCallbackSuccess } from "@/lib/daraja-stk-result";
import { schedulePaymentEmailsAfterResponse } from "@/lib/deliver-payment-emails";

type CallbackMetadataItem = { Name: string; Value: string | number };
type StkCallback = {
  MerchantRequestID?: string;
  CheckoutRequestID?: string;
  ResultCode?: number | string;
  ResultDesc?: string;
  CallbackMetadata?: { Item?: CallbackMetadataItem[] };
};
type DarajaCallbackBody = { Body?: { stkCallback?: StkCallback } };

/**
 * Daraja STK Push callback - called by Safaricom when user completes/cancels M-Pesa prompt.
 *
 * ResultCode 0 (or MpesaReceiptNumber in metadata) = success.
 * On success: update transaction, fulfill tickets/votes, send receipt.
 */
export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    let payload: DarajaCallbackBody;
    try {
      payload = JSON.parse(rawBody) as DarajaCallbackBody;
    } catch {
      return NextResponse.json({ ResultCode: 1, ResultDesc: "Invalid JSON" }, { status: 400 });
    }

    const stk = payload.Body?.stkCallback;
    if (!stk) {
      return NextResponse.json({ ResultCode: 1, ResultDesc: "Missing stkCallback" }, { status: 200 });
    }

    const checkoutRequestId = String(stk.CheckoutRequestID ?? "").trim();
    if (!checkoutRequestId) {
      return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" }, { status: 200 });
    }

    const resultCode = stk.ResultCode;
    const resultDesc = String(stk.ResultDesc ?? "");
    const items = stk.CallbackMetadata?.Item ?? [];
    const success = isStkCallbackSuccess(resultCode, items);

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ ResultCode: 1, ResultDesc: "Server config error" }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    const tx = await findDarajaTransactionForStkCallback(supabase, checkoutRequestId);

    if (!tx) {
      console.warn("[Daraja callback] No transaction for CheckoutRequestID:", checkoutRequestId);
      return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" }, { status: 200 });
    }

    if (String((tx as { status?: string }).status ?? "") === "success") {
      schedulePaymentEmailsAfterResponse(supabase, String(tx.id), "[Daraja callback]");
      return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" }, { status: 200 });
    }

    if (!success) {
      if (String((tx as { status?: string }).status ?? "") !== "pending") {
        return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" }, { status: 200 });
      }

      const resultCodeNum = Number(resultCode ?? -1);
      await supabase
        .from("transactions")
        .update({
          status: "failed",
          verified_at: new Date().toISOString(),
          metadata: {
            ...(typeof tx.metadata === "object" && tx.metadata ? tx.metadata : {}),
            daraja_result_code: resultCodeNum,
            daraja_result_desc: resultDesc,
          },
        } as Record<string, unknown>)
        .eq("id", tx.id);
      void notifyCampaignOwnerPaymentIncomplete(supabase, {
        campaignId: String(tx.campaign_id),
        reference: String(tx.reference),
        amount: Number(tx.amount),
        currency: String(tx.currency ?? "KES"),
        provider: "M-Pesa (Daraja)",
        payerEmail: (tx as { email?: string | null }).email,
        payerName: (tx as { payer_name?: string | null }).payer_name,
        reason: resultDesc ? `M-Pesa: ${resultDesc}` : `M-Pesa result code ${resultCodeNum}`,
      });
      const toEmail = (tx as { email?: string | null }).email?.trim?.();
      if (toEmail) {
        sendPurchaseReminderByRef(tx.reference, supabase).catch((err) =>
          console.warn("[Daraja] Purchase reminder email error:", err instanceof Error ? err.message : err)
        );
      }
      return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" }, { status: 200 });
    }

    await finalizeDarajaStkFromMetadataItems(supabase, tx, items);

    return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" }, { status: 200 });
  } catch (e: unknown) {
    return NextResponse.json(
      { ResultCode: 1, ResultDesc: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}
