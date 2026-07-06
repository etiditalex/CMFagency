import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { reconcileDarajaPendingTransaction, type DarajaTxRow } from "@/lib/daraja-reconcile-pending";

export const dynamic = "force-dynamic";

async function isAuthorized(req: Request): Promise<boolean> {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace(/^Bearer\s+/i, "");

  const syncToken = process.env.DARAJA_SYNC_TOKEN ?? process.env.PAYSTACK_SYNC_TOKEN;
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
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);
  if (error || !user) return false;

  const { data: pm } = await supabase.from("portal_members").select("role").eq("user_id", user.id).maybeSingle();
  if (pm) return true;
  const { data: au } = await supabase.from("admin_users").select("user_id").eq("user_id", user.id).maybeSingle();
  return !!au;
}

/**
 * Reconcile all pending M-Pesa (Daraja) transactions via STK Push Query.
 * Marks each row success or failed when Safaricom reports a terminal state.
 */
export async function GET(req: Request) {
  if (!(await isAuthorized(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });

  const { data: pendingRows, error: fetchErr } = await supabase
    .from("transactions")
    .select(
      "id,reference,campaign_id,campaign_type,contestant_id,quantity,amount,currency,status,fulfilled_at,metadata,email,payer_name,coupon_id,created_at"
    )
    .eq("provider", "daraja")
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  if (!pendingRows?.length) {
    return NextResponse.json({ updated: 0, message: "No pending M-Pesa transactions" });
  }

  let updated = 0;
  let markedSuccess = 0;
  let markedFailed = 0;
  let stillPending = 0;
  const errors: string[] = [];

  for (const row of pendingRows as DarajaTxRow[]) {
    try {
      const outcome = await reconcileDarajaPendingTransaction(supabase, row, {
        reconciledVia: "daraja_sync_pending",
      });

      if (outcome.result === "success") {
        updated++;
        markedSuccess++;
      } else if (outcome.result === "failed") {
        updated++;
        markedFailed++;
      } else if (outcome.result === "pending") {
        stillPending++;
      } else if (outcome.result === "error") {
        errors.push(`${row.reference}: ${outcome.message}`);
      }
    } catch (e) {
      errors.push(`${row.reference}: ${e instanceof Error ? e.message : "Unknown error"}`);
    }
  }

  return NextResponse.json({
    updated,
    total: pendingRows.length,
    marked_success: markedSuccess,
    marked_failed: markedFailed,
    still_pending: stillPending,
    errors: errors.length ? errors : undefined,
  });
}
