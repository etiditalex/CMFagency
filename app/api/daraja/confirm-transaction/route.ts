import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { deliverPaymentEmailsOnce } from "@/lib/deliver-payment-emails";

/**
 * POST: Admin-only. Mark a pending M-Pesa transaction as success and fulfill (tickets/votes + receipt email).
 * Use when the Daraja callback did not run (e.g. URL unreachable) but the customer has paid.
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
      .select("id,campaign_id,campaign_type,contestant_id,quantity,amount,currency,reference,status,fulfilled_at,metadata,email,payer_name,coupon_id")
      .eq("reference", reference)
      .single();

    if (txErr || !tx) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }
    if (tx.status !== "pending") {
      return NextResponse.json({ error: "Transaction is not pending", status: tx.status }, { status: 400 });
    }
    if (String((tx as { provider?: string }).provider ?? "") !== "daraja") {
      return NextResponse.json({ error: "Only M-Pesa (daraja) transactions can be confirmed here" }, { status: 400 });
    }

    const meta = typeof tx.metadata === "object" && tx.metadata ? (tx.metadata as Record<string, unknown>) : {};

    await admin
      .from("transactions")
      .update({
        status: "success",
        verified_at: new Date().toISOString(),
        paid_at: new Date().toISOString(),
      } as Record<string, unknown>)
      .eq("id", tx.id);

    let fulfillmentError: string | null = null;
    if (!tx.fulfilled_at) {
      let fulfillErr: string | null = null;
      if (tx.campaign_type === "vote") {
        if (!tx.contestant_id) {
          fulfillErr = "vote_missing_contestant_id";
        } else {
          const { error: voteErr } = await admin.from("votes").upsert(
            {
              transaction_id: tx.id,
              campaign_id: tx.campaign_id,
              contestant_id: tx.contestant_id,
              votes: tx.quantity,
            },
            { onConflict: "transaction_id" }
          );
          if (voteErr) fulfillErr = voteErr.message;
        }
      } else {
        const { error: ticketErr } = await admin.from("ticket_issues").upsert(
          {
            transaction_id: tx.id,
            campaign_id: tx.campaign_id,
            quantity: tx.quantity,
          },
          { onConflict: "transaction_id" }
        );
        if (ticketErr) fulfillErr = ticketErr.message;
      }

      if (!fulfillErr) {
        await admin
          .from("transactions")
          .update({ fulfilled_at: new Date().toISOString() } as Record<string, unknown>)
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
      fulfillmentError = fulfillErr;
    } else if (
      !(meta as { merchandise_cart?: boolean }).merchandise_cart &&
      tx.campaign_type === "vote" &&
      tx.contestant_id
    ) {
      const { data: vRow } = await admin.from("votes").select("id").eq("transaction_id", tx.id).maybeSingle();
      if (!vRow) {
        const { error: repairErr } = await admin.from("votes").upsert(
          {
            transaction_id: tx.id,
            campaign_id: tx.campaign_id,
            contestant_id: tx.contestant_id,
            votes: tx.quantity,
          },
          { onConflict: "transaction_id" }
        );
        if (repairErr) fulfillmentError = repairErr.message;
      }
    } else if (!(meta as { merchandise_cart?: boolean }).merchandise_cart && tx.campaign_type === "ticket") {
      const { data: tRow } = await admin.from("ticket_issues").select("id").eq("transaction_id", tx.id).maybeSingle();
      if (!tRow) {
        const { error: repairErr } = await admin.from("ticket_issues").upsert(
          {
            transaction_id: tx.id,
            campaign_id: tx.campaign_id,
            quantity: tx.quantity,
          },
          { onConflict: "transaction_id" }
        );
        if (repairErr) fulfillmentError = repairErr.message;
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
