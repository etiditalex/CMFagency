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
  const { userId } = authResult.auth;

  const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey, {
    global: (() => {
      const t = parseBearerToken(req);
      return t ? { headers: { Authorization: `Bearer ${t}` } } : {};
    })(),
  });

  try {
    // Campaign IDs: always user's own campaigns (balance is per-user)
    const { data: campaigns, error: cErr } = await supabase
      .from("campaigns")
      .select("id")
      .eq("created_by", userId);
    if (cErr) throw cErr;
    const campaignIds = (campaigns ?? []).map((c: { id: string }) => c.id);

    if (campaignIds.length === 0) {
      return NextResponse.json({
        mpesa: 0,
        paystack: 0,
        mpesaAvailable: 0,
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

    // Pending M-Pesa withdrawals (reduce available) - use supabase (RLS allows own rows)
    const { data: withdrawals } = await supabase
      .from("withdrawal_requests")
      .select("amount,status")
      .eq("created_by", userId)
      .in("status", ["pending_admin", "approved", "processing", "completed"]);

    let withdrawnMpesa = 0;
    for (const w of withdrawals ?? []) {
      if (["approved", "processing", "completed"].includes(String(w.status ?? ""))) {
        withdrawnMpesa += Number(w.amount ?? 0) || 0;
      }
    }

    const mpesaAvailable = Math.max(0, mpesa - withdrawnMpesa);

    return NextResponse.json({
      mpesa,
      paystack,
      mpesaAvailable,
    });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load balance" },
      { status: 500 }
    );
  }
}
