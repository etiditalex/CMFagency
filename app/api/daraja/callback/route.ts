import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type CallbackMetadataItem = { Name: string; Value: string | number };
type StkCallback = {
  MerchantRequestID?: string;
  CheckoutRequestID?: string;
  ResultCode?: number;
  ResultDesc?: string;
  CallbackMetadata?: { Item?: CallbackMetadataItem[] };
};
type DarajaCallbackBody = { Body?: { stkCallback?: StkCallback } };

/**
 * Daraja STK Push callback - called by Safaricom when user completes/cancels M-Pesa prompt.
 *
 * ResultCode 0 = success. Other codes = user cancelled or failed.
 * On success: update transaction, fulfill tickets/votes, send receipt.
 *
 * Env required:
 * - SUPABASE_URL / NEXT_PUBLIC_SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 *
 * Optional (receipt email):
 * - RESEND_API_KEY
 * - RESEND_FROM_EMAIL
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

    const checkoutRequestId = stk.CheckoutRequestID;
    const resultCode = Number(stk.ResultCode ?? -1);
    const resultDesc = String(stk.ResultDesc ?? "");

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ ResultCode: 1, ResultDesc: "Server config error" }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    // Find transaction by checkout_request_id in metadata
    const { data: rows } = await supabase
      .from("transactions")
      .select("id,campaign_id,campaign_type,contestant_id,quantity,amount,currency,reference,status,fulfilled_at,metadata,email,payer_name")
      .eq("provider", "daraja")
      .eq("status", "pending");

    const tx = rows?.find(
      (r) => (r.metadata as Record<string, unknown>)?.checkout_request_id === checkoutRequestId
    );

    if (!tx) {
      // Acknowledge to avoid Safaricom retries - unknown request
      return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" }, { status: 200 });
    }

    if (resultCode !== 0) {
      // User cancelled or failed
      await supabase
        .from("transactions")
        .update({
          status: "failed",
          verified_at: new Date().toISOString(),
          metadata: {
            ...(typeof tx.metadata === "object" && tx.metadata ? tx.metadata : {}),
            daraja_result_code: resultCode,
            daraja_result_desc: resultDesc,
          },
        } as any)
        .eq("id", tx.id);
      return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" }, { status: 200 });
    }

    // Success - extract M-Pesa receipt from CallbackMetadata
    const items = stk.CallbackMetadata?.Item ?? [];
    const getItem = (name: string) => items.find((i) => i.Name === name)?.Value;
    const mpesaReceipt = String(getItem("MpesaReceiptNumber") ?? "");
    const transactionDate = getItem("TransactionDate");
    const paidAmount = Number(getItem("Amount") ?? tx.amount);

    // Basic validation
    const expectedAmount = Number(tx.amount);
    if (Math.abs(paidAmount - expectedAmount) > 1) {
      await supabase
        .from("transactions")
        .update({
          status: "failed",
          verified_at: new Date().toISOString(),
          metadata: {
            ...(typeof tx.metadata === "object" && tx.metadata ? tx.metadata : {}),
            daraja_error: "amount_mismatch",
            daraja_amount: paidAmount,
            mpesa_receipt: mpesaReceipt,
          },
        } as any)
        .eq("id", tx.id);
      return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" }, { status: 200 });
    }

    const meta = typeof tx.metadata === "object" && tx.metadata ? (tx.metadata as Record<string, unknown>) : {};
    const updatedMeta = {
      ...meta,
      mpesa_receipt: mpesaReceipt,
      daraja_transaction_date: transactionDate,
    };

    await supabase
      .from("transactions")
      .update({
        status: "success",
        verified_at: new Date().toISOString(),
        paid_at: new Date().toISOString(),
        metadata: updatedMeta,
      } as any)
      .eq("id", tx.id);

    if (tx.fulfilled_at) {
      return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" }, { status: 200 });
    }

    // Merchandise: just mark fulfilled
    if (meta.merchandise_cart === true) {
      await supabase
        .from("transactions")
        .update({ fulfilled_at: new Date().toISOString() } as any)
        .eq("id", tx.id)
        .is("fulfilled_at", null);
      return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" }, { status: 200 });
    }

    // Fulfill tickets or votes
    if (tx.campaign_type === "vote" && tx.contestant_id) {
      await supabase.from("votes").upsert(
        {
          transaction_id: tx.id,
          campaign_id: tx.campaign_id,
          contestant_id: tx.contestant_id,
          votes: tx.quantity,
        },
        { onConflict: "transaction_id", ignoreDuplicates: true }
      );
    } else {
      await supabase.from("ticket_issues").upsert(
        {
          transaction_id: tx.id,
          campaign_id: tx.campaign_id,
          quantity: tx.quantity,
        },
        { onConflict: "transaction_id", ignoreDuplicates: true }
      );
    }

    await supabase
      .from("transactions")
      .update({ fulfilled_at: new Date().toISOString() } as any)
      .eq("id", tx.id)
      .is("fulfilled_at", null);

    // Send receipt email
    const toEmail = (tx as { email?: string | null }).email?.trim?.();
    if (toEmail) {
      const resendKey = process.env.RESEND_API_KEY;
      const fromEmail = process.env.RESEND_FROM_EMAIL || "CMF Agency <noreply@resend.dev>";
      const holderName = (tx as { payer_name?: string | null }).payer_name?.trim?.() || toEmail;
      const reference = tx.reference;
      const ticketSuffix = reference.replace(/^cmf_/, "").slice(-8).toUpperCase();
      const slug = meta.slug || meta.campaign_slug || "event";
      const prefix = String(slug).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
      const typeCode = tx.campaign_type === "vote" ? "VOT" : meta.merchandise_cart ? "ORD" : "TKT";
      const ticketNumber = `${prefix}-${typeCode}-${ticketSuffix}`;
      const campaignTitle = meta.campaign_title || meta.slug || "Event";
      const typeLabel = tx.campaign_type === "vote" ? "Vote" : meta.merchandise_cart ? "Order" : "Ticket";

      if (resendKey) {
        const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 560px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #00A651 0%, #007A3D 100%); padding: 24px; text-align: center; border-radius: 12px 12px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 1.4rem;">${String(campaignTitle).replace(/</g, "&lt;")}</h1>
    <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0;">M-Pesa payment confirmed</p>
  </div>
  <div style="background: #f8f9fa; padding: 24px; border: 1px solid #e9ecef; border-top: none; border-radius: 0 0 12px 12px;">
    <table style="width:100%; border-collapse: collapse;">
      <tr><td style="padding: 8px 0; color: #666;">${typeLabel} number:</td><td style="padding: 8px 0; font-weight: bold; font-family: monospace;">${ticketNumber}</td></tr>
      <tr><td style="padding: 8px 0; color: #666;">${typeLabel} holder:</td><td style="padding: 8px 0; font-weight: bold;">${String(holderName).replace(/</g, "&lt;")}</td></tr>
      <tr><td style="padding: 8px 0; color: #666;">Amount paid:</td><td style="padding: 8px 0; font-weight: bold;">KES ${Number(tx.amount || 0).toLocaleString()}</td></tr>
      <tr><td style="padding: 8px 0; color: #666;">M-Pesa receipt:</td><td style="padding: 8px 0; font-weight: bold;">${String(mpesaReceipt).replace(/</g, "&lt;")}</td></tr>
      <tr><td style="padding: 8px 0; color: #666;">Quantity:</td><td style="padding: 8px 0; font-weight: bold;">${tx.quantity} ${tx.campaign_type === "vote" ? "votes" : meta.merchandise_cart ? "items" : "tickets"}</td></tr>
    </table>
    <p style="margin-top: 20px; font-size: 12px; color: #666;">Reference: <code>${reference}</code></p>
  </div>
  <p style="color: #888; font-size: 11px; margin-top: 20px;">Sent by CMF Agency · Changer Fusions</p>
</body>
</html>`;
        try {
          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${resendKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: fromEmail,
              to: toEmail,
              subject: `Your ${typeLabel.toLowerCase()} receipt – ${campaignTitle}`,
              html,
            }),
          });
        } catch {
          /* non-fatal */
        }
      }
    }

    return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" }, { status: 200 });
  } catch (e: unknown) {
    return NextResponse.json(
      { ResultCode: 1, ResultDesc: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}
