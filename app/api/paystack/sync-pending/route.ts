import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { paystackChargeMatchesTransaction } from "@/lib/paystack-charge-matches-transaction";
import { finalizePaystackTransactionSuccess, type PaystackFulfillmentRow } from "@/lib/paystack-finalize-success";
import { notifyCampaignOwnerPaymentIncomplete } from "@/lib/notify-campaign-owner-payment-incomplete";

/**
 * Syncs pending Paystack transactions by verifying each with Paystack's API.
 * Use when webhook misses events and transactions stay "pending".
 *
 * Auth: Requires Bearer token (Supabase JWT) of an admin/portal member.
 *       Or PAYSTACK_SYNC_TOKEN in query/header for cron/manual use.
 */
async function isAuthorized(req: Request): Promise<boolean> {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace(/^Bearer\s+/i, "");

  const syncToken = process.env.PAYSTACK_SYNC_TOKEN;
  const url = new URL(req.url);
  const qToken = url.searchParams.get("token") ?? req.headers.get("x-sync-token") ?? "";
  if (syncToken && (qToken === syncToken || token === syncToken)) return true;

  if (!token) return false;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) return false;

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return false;

  // RLS requires auth.uid(); the client above sends the JWT so these queries run as the user.
  const { data: pm } = await supabase.from("portal_members").select("role").eq("user_id", user.id).maybeSingle();
  if (pm) return true;
  const { data: au } = await supabase.from("admin_users").select("user_id").eq("user_id", user.id).maybeSingle();
  return !!au;
}

export async function GET(req: Request) {
  if (!(await isAuthorized(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const paystackSecret = process.env.PAYSTACK_SECRET_KEY;

  const missing: string[] = [];
  if (!supabaseUrl) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!supabaseServiceKey) missing.push("SUPABASE_SERVICE_ROLE_KEY");
  if (!paystackSecret) missing.push("PAYSTACK_SECRET_KEY");
  if (missing.length) {
    return NextResponse.json(
      { error: `Missing server configuration. Add to Vercel: ${missing.join(", ")}` },
      { status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl!, supabaseServiceKey!, {
    auth: { persistSession: false },
  });

  const { data: pendingRows, error: fetchErr } = await supabase
    .from("transactions")
    .select(
      "id,reference,campaign_id,campaign_type,contestant_id,quantity,amount,currency,fulfilled_at,metadata,coupon_id,email,payer_name"
    )
    .eq("provider", "paystack")
    .eq("status", "pending");

  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  if (!pendingRows?.length) {
    return NextResponse.json({ updated: 0, message: "No pending Paystack transactions" });
  }

  let updated = 0;
  const errors: string[] = [];

  for (const tx of pendingRows) {
    try {
      const res = await fetch(
        `https://api.paystack.co/transaction/verify/${encodeURIComponent(tx.reference)}`,
        { headers: { Authorization: `Bearer ${paystackSecret}` } }
      );
      const json = (await res.json()) as { status?: boolean; data?: { status?: string; amount?: number; currency?: string; paid_at?: string } };

      if (!res.ok || !json?.data) {
        errors.push(`${tx.reference}: Paystack verify failed`);
        continue;
      }

      const paystackStatus = String(json.data?.status ?? "").toLowerCase();
      if (paystackStatus !== "success") continue;

      const paidAmountSubunit = Number(json.data?.amount ?? 0);
      const paidCurrency = (json.data?.currency ?? "").toUpperCase();
      const match = paystackChargeMatchesTransaction(paidAmountSubunit, paidCurrency, tx as PaystackFulfillmentRow);
      if (!match.ok) {
        const prevMeta =
          typeof tx.metadata === "object" && tx.metadata !== null && !Array.isArray(tx.metadata)
            ? { ...(tx.metadata as Record<string, unknown>) }
            : {};
        await supabase
          .from("transactions")
          .update({
            status: "failed",
            verified_at: new Date().toISOString(),
            metadata: {
              ...prevMeta,
              webhook_error: match.code === "amount" ? "amount_mismatch" : "currency_mismatch",
              paystack_amount: paidAmountSubunit,
              paystack_currency: paidCurrency,
            },
          } as Record<string, unknown>)
          .eq("id", tx.id);
        void notifyCampaignOwnerPaymentIncomplete(supabase, {
          campaignId: String(tx.campaign_id),
          reference: String(tx.reference),
          amount: Number(tx.amount),
          currency: String(tx.currency ?? "KES"),
          provider: "Paystack",
          payerEmail: (tx as { email?: string | null }).email,
          payerName: (tx as { payer_name?: string | null }).payer_name,
          reason: "Paystack verify: amount or currency did not match the checkout",
        });
        updated++;
        continue;
      }

      await finalizePaystackTransactionSuccess(supabase, tx as PaystackFulfillmentRow, {
        paidAt: json.data?.paid_at ?? new Date().toISOString(),
        metadataPatch: {},
      });

      updated++;
    } catch (e) {
      errors.push(`${tx.reference}: ${(e as Error)?.message ?? "Unknown error"}`);
    }
  }

  return NextResponse.json({
    updated,
    total: pendingRows.length,
    errors: errors.length ? errors : undefined,
  });
}
