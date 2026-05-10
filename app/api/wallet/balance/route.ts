import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { fetchAllSupabasePages } from "@/lib/supabase-fetch-all-pages";
import {
  authenticateWalletRequest,
  getWalletSupabasePublicEnv,
  parseBearerToken,
} from "@/lib/wallet-request-auth";

/**
 * Returns wallet balance split by M-Pesa (Daraja) and Paystack.
 * Requires authenticated portal member.
 */
export async function GET(req: Request) {
  const env = getWalletSupabasePublicEnv();
  if (!env) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  const authResult = await authenticateWalletRequest(req, env);
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }
  const { userId, portal, legacyAdmin } = authResult.auth;

  const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey, {
    global: (() => {
      const t = parseBearerToken(req);
      return t ? { headers: { Authorization: `Bearer ${t}` } } : {};
    })(),
  });

  try {
    const isAdminScope = legacyAdmin || portal?.role === "admin";
    const includeKcmInflow =
      Array.isArray(portal?.features) && (portal?.features ?? []).map((f) => String(f).toLowerCase()).includes("kcm_payouts_inflow");
    // Admins: all visible campaigns via RLS. Others: own campaigns only.
    const campaignsQuery = supabase.from("campaigns").select("id").order("created_at", { ascending: false });
    const { data: campaigns, error: cErr } = isAdminScope
      ? await campaignsQuery
      : await campaignsQuery.eq("created_by", userId);
    if (cErr) throw cErr;
    const campaignIds = (campaigns ?? []).map((c: { id: string }) => c.id);

    // Optional: add KCM registration + contributions inflow into the M-Pesa totals (per-user feature flag).
    let kcmPaidKes = 0;
    let kcmContributionKes = 0;
    if (includeKcmInflow) {
      const { data: membershipRows, error: kmErr } = await supabase
        .from("kcm_memberships")
        .select("payment_status,payment_confirmed,payment_amount_kes");
      if (kmErr) throw kmErr;
      for (const row of (membershipRows ?? []) as Array<{
        payment_status?: string | null;
        payment_confirmed?: boolean | null;
        payment_amount_kes?: number | null;
      }>) {
        const paid =
          String(row.payment_status ?? "").toLowerCase() === "success" || !!row.payment_confirmed;
        if (!paid) continue;
        const amt = Number(row.payment_amount_kes ?? 0);
        if (!Number.isFinite(amt) || amt <= 0) continue;
        kcmPaidKes += amt;
      }

      const { data: contribRows, error: kcErr } = await supabase
        .from("kcm_member_wallet_transactions")
        .select("amount_kes,status");
      if (kcErr) throw kcErr;
      for (const row of (contribRows ?? []) as Array<{ amount_kes?: number | null; status?: string | null }>) {
        const status = String(row.status ?? "").toLowerCase();
        if (status !== "success") continue;
        const amt = Number(row.amount_kes ?? 0);
        if (!Number.isFinite(amt) || amt <= 0) continue;
        kcmContributionKes += amt;
      }
    }
    const kcmTotalKes = kcmPaidKes + kcmContributionKes;

    if (campaignIds.length === 0) {
      return NextResponse.json({
        mpesa: kcmTotalKes,
        paystack: 0,
        mpesaAvailable: kcmTotalKes,
        mpesaPendingApproval: 0,
        mpesaInTransit: 0,
        mpesaPaidOut: 0,
        scope: isAdminScope ? "visible_campaigns" : "owned_campaigns",
      });
    }

    // Sum successful transactions by provider (paginate — default response cap is 1000 rows)
    const txRows = await fetchAllSupabasePages(async (from, to) => {
      const r = await supabase
        .from("transactions")
        .select("amount,provider")
        .eq("status", "success")
        .in("campaign_id", campaignIds)
        .order("id", { ascending: true })
        .range(from, to);
      return { data: r.data as { amount: number; provider: string | null }[] | null, error: r.error };
    });

    const isMpesa = (p: string | null | undefined) => {
      const s = String(p ?? "").toLowerCase();
      return s === "daraja" || s.includes("mpesa") || s.includes("m-pesa");
    };

    let mpesa = 0;
    let paystack = 0;
    for (const t of txRows) {
      const amt = Number(t.amount ?? 0) || 0;
      if (isMpesa(t.provider)) mpesa += amt;
      else paystack += amt;
    }
    mpesa += kcmTotalKes;

    // Pending M-Pesa withdrawals (reduce available) - use supabase (RLS allows own rows)
    const { data: withdrawals } = await supabase
      .from("withdrawal_requests")
      .select("amount,status")
      .eq("created_by", userId)
      .in("status", ["pending_admin", "approved", "processing", "completed"]);

    let withdrawnMpesa = 0;
    let mpesaPendingApproval = 0;
    let mpesaInTransit = 0;
    let mpesaPaidOut = 0;
    for (const w of withdrawals ?? []) {
      const status = String(w.status ?? "");
      const amount = Number(w.amount ?? 0) || 0;
      if (!Number.isFinite(amount) || amount <= 0) continue;

      if (status === "pending_admin") {
        mpesaPendingApproval += amount;
      } else if (status === "approved" || status === "processing") {
        mpesaInTransit += amount;
        withdrawnMpesa += amount;
      } else if (status === "completed") {
        mpesaPaidOut += amount;
        withdrawnMpesa += amount;
      }
    }

    const mpesaAvailable = Math.max(0, mpesa - withdrawnMpesa);

    return NextResponse.json({
      mpesa,
      paystack,
      mpesaAvailable,
      mpesaPendingApproval,
      mpesaInTransit,
      mpesaPaidOut,
      scope: isAdminScope ? "visible_campaigns" : "owned_campaigns",
    });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load balance" },
      { status: 500 }
    );
  }
}
