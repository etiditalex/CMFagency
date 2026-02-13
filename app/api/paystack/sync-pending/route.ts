import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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
    .select("id,reference,campaign_id,campaign_type,contestant_id,quantity,amount,currency,fulfilled_at")
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
      const expectedSubunit = Math.round(Number(tx.amount) * 100);
      const paidCurrency = (json.data?.currency ?? "").toUpperCase();
      if (paidAmountSubunit !== expectedSubunit || paidCurrency !== String(tx.currency).toUpperCase()) {
        await supabase
          .from("transactions")
          .update({
            status: "failed",
            verified_at: new Date().toISOString(),
            metadata: { webhook_error: "amount_or_currency_mismatch", paystack_amount: paidAmountSubunit, paystack_currency: paidCurrency },
          } as any)
          .eq("id", tx.id);
        updated++;
        continue;
      }

      await supabase
        .from("transactions")
        .update({
          status: "success",
          verified_at: new Date().toISOString(),
          paid_at: json.data?.paid_at ?? new Date().toISOString(),
        } as any)
        .eq("id", tx.id);

      if (!tx.fulfilled_at) {
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
      }

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
