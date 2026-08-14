import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { deliverPaymentEmailsOnce } from "@/lib/deliver-payment-emails";
import { upsertVoteOrTicketForSuccessfulTx } from "@/lib/vote-ticket-fulfillment";

/**
 * POST: Admin-only. Mark a pending or failed M-Pesa transaction as success and
 * fulfill (tickets/votes + receipt email).
 *
 * Paybill (manual Lipa na M-Pesa after STK failed) is never auto-verified.
 * Only this admin action may mark those rows paid.
 * Pending STK Push still confirms automatically via Safaricom callback / STK query.
 *
 * Body: { reference: "cmf_xxx" }
 */
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace(/^Bearer\s+/i, "").trim();
    if (!token) return NextResponse.json({ error: "Missing authorization" }, { status: 401 });

    let body: { reference?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const reference = String(body?.reference ?? "").trim();
    if (!reference) return NextResponse.json({ error: "Missing reference" }, { status: 400 });

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: callerData, error: callerErr } = await admin.auth.getUser(token);
    if (callerErr || !callerData?.user) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }
    const callerId = String(callerData.user.id ?? "");
    const { data: memberRow } = await admin.from("portal_members").select("role").eq("user_id", callerId).maybeSingle();
    const isFullAdmin = memberRow?.role === "admin";
    const isLegacyAdmin = !memberRow
      ? (await admin.from("admin_users").select("user_id").eq("user_id", callerId).maybeSingle()).data != null
      : false;
    if (!isFullAdmin && !isLegacyAdmin) {
      return NextResponse.json({ error: "Forbidden: admin only" }, { status: 403 });
    }

    const { data: tx, error: txErr } = await admin
      .from("transactions")
      .select(
        "id,campaign_id,campaign_type,contestant_id,quantity,amount,currency,reference,status,fulfilled_at,metadata,email,payer_name,coupon_id,provider"
      )
      .eq("reference", reference)
      .single();

    if (txErr || !tx) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    const status = String(tx.status ?? "");
    const meta =
      typeof tx.metadata === "object" && tx.metadata !== null && !Array.isArray(tx.metadata)
        ? { ...(tx.metadata as Record<string, unknown>) }
        : {};
    const provider = String((tx as { provider?: string | null }).provider ?? "").toLowerCase();
    const isDaraja = provider === "daraja" || Boolean(String(meta.checkout_request_id ?? "").trim());

    if (status === "success") {
      if (!tx.fulfilled_at) {
        const { fulfillErr } = await upsertVoteOrTicketForSuccessfulTx(
          admin,
          {
            id: String(tx.id),
            campaign_id: String(tx.campaign_id),
            campaign_type: String(tx.campaign_type ?? ""),
            contestant_id: (tx.contestant_id as string | null) ?? null,
            quantity: Number(tx.quantity ?? 0),
          },
          "[daraja/confirm-transaction]"
        );
        if (!fulfillErr) {
          await admin
            .from("transactions")
            .update({ fulfilled_at: new Date().toISOString() } as Record<string, unknown>)
            .eq("id", tx.id)
            .is("fulfilled_at", null);
        }
      }
      await deliverPaymentEmailsOnce(admin, {
        transactionId: String(tx.id),
        logPrefix: "[daraja/confirm-transaction]",
      });
      return NextResponse.json({ ok: true, message: "Transaction already successful; ticket/receipt sent." });
    }

    if (status !== "pending" && status !== "failed") {
      return NextResponse.json({ error: "Transaction cannot be confirmed", status }, { status: 400 });
    }
    if (!isDaraja) {
      return NextResponse.json({ error: "Only M-Pesa (daraja) transactions can be confirmed here" }, { status: 400 });
    }

    const paidAt = new Date().toISOString();
    delete meta.daraja_result_code;
    delete meta.daraja_result_desc;
    delete meta.daraja_error;
    meta.reconciled_via = "admin_confirm_transaction";
    meta.reconciled_note = "Admin confirmed after STK callback miss or paybill payment.";

    await admin
      .from("transactions")
      .update({
        status: "success",
        verified_at: paidAt,
        paid_at: paidAt,
        metadata: meta,
      } as Record<string, unknown>)
      .eq("id", tx.id);

    let fulfillmentError: string | null = null;
    if (!tx.fulfilled_at) {
      const { fulfillErr } = await upsertVoteOrTicketForSuccessfulTx(
        admin,
        {
          id: String(tx.id),
          campaign_id: String(tx.campaign_id),
          campaign_type: String(tx.campaign_type ?? ""),
          contestant_id: (tx.contestant_id as string | null) ?? null,
          quantity: Number(tx.quantity ?? 0),
        },
        "[daraja/confirm-transaction]"
      );
      fulfillmentError = fulfillErr;

      if (!fulfillErr) {
        await admin
          .from("transactions")
          .update({ fulfilled_at: paidAt } as Record<string, unknown>)
          .eq("id", tx.id)
          .is("fulfilled_at", null);

        const couponId = (tx as { coupon_id?: string | null }).coupon_id;
        if (couponId) {
          const { data: cou } = await admin.from("coupons").select("used_count").eq("id", couponId).single();
          if (cou) {
            const nextCount = ((cou as { used_count: number }).used_count ?? 0) + 1;
            await admin.from("coupons").update({ used_count: nextCount }).eq("id", couponId);
          }
        }
      } else {
        await admin
          .from("transactions")
          .update({
            metadata: {
              ...meta,
              fulfillment_error: fulfillErr,
            },
          } as Record<string, unknown>)
          .eq("id", tx.id);
      }
    }

    if (!fulfillmentError) {
      await deliverPaymentEmailsOnce(admin, {
        transactionId: String(tx.id),
        logPrefix: "[daraja/confirm-transaction]",
      });
    }

    if (fulfillmentError) {
      return NextResponse.json({
        ok: true,
        partial: true,
        message:
          "Transaction marked paid, but votes or tickets were not recorded. Fix the cause (see fulfillment_error), apply the votes table migration if needed, then confirm again.",
        fulfillment_error: fulfillmentError,
      });
    }
    return NextResponse.json({ ok: true, message: "Transaction marked success and fulfilled." });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}
