import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { fetchAllSupabasePages } from "@/lib/supabase-fetch-all-pages";
import {
  authenticateWalletRequest,
  canRequestWalletWithdrawal,
  getWalletSupabasePublicEnv,
  parseBearerToken,
} from "@/lib/wallet-request-auth";

/**
 * Creates a M-Pesa withdrawal request (status: pending_admin).
 * Admin must approve before B2C is executed.
 */
export async function POST(req: Request) {
  const env = getWalletSupabasePublicEnv();
  if (!env) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  const authResult = await authenticateWalletRequest(req, env);
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }
  const auth = authResult.auth;

  let body: { amount?: number; recipient_phone?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const amount = Math.trunc(Number(body.amount ?? 0));
  const phoneRaw = String(body.recipient_phone ?? "").trim().replace(/\s/g, "");
  const phone =
    phoneRaw.startsWith("+254") ? `254${phoneRaw.slice(4)}` :
    phoneRaw.startsWith("254") ? phoneRaw :
    phoneRaw.startsWith("0") ? `254${phoneRaw.slice(1)}` :
    phoneRaw.length === 9 ? `254${phoneRaw}` : phoneRaw;

  if (!Number.isFinite(amount) || amount < 10) {
    return NextResponse.json({ error: "Amount must be at least 10 KES" }, { status: 400 });
  }
  if (!/^254[17]\d{8}$/.test(phone)) {
    return NextResponse.json({ error: "Enter a valid M-Pesa number (e.g. 254712345678)" }, { status: 400 });
  }

  const supabaseUrl = env.supabaseUrl;
  const supabaseAnonKey = env.supabaseAnonKey;

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: (() => {
      const t = parseBearerToken(req);
      return t ? { headers: { Authorization: `Bearer ${t}` } } : {};
    })(),
  });

  try {
    if (!canRequestWalletWithdrawal(auth)) {
      return NextResponse.json({ error: "Payouts feature not enabled" }, { status: 403 });
    }

    // Get available M-Pesa balance
    let campaignsQuery = supabase.from("campaigns").select("id").eq("created_by", auth.userId);
    const { data: campaigns } = await campaignsQuery;
    const campaignIds = (campaigns ?? []).map((c: { id: string }) => c.id);

    if (campaignIds.length === 0) {
      return NextResponse.json({ error: "No campaigns found. Balance is calculated from your campaign revenue." }, { status: 400 });
    }

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

    let mpesaIn = 0;
    for (const t of txRows) {
      if (String(t.provider ?? "").toLowerCase() === "daraja") {
        mpesaIn += Number(t.amount ?? 0) || 0;
      }
    }

    const { data: withdrawals } = await supabase
      .from("withdrawal_requests")
      .select("amount,status")
      .eq("created_by", auth.userId)
      .in("status", ["approved", "processing", "completed"]);

    let withdrawn = 0;
    for (const w of withdrawals ?? []) {
      withdrawn += Number(w.amount ?? 0) || 0;
    }

    const available = Math.max(0, mpesaIn - withdrawn);
    if (amount > available) {
      return NextResponse.json(
        { error: `Insufficient M-Pesa balance. Available: KES ${available.toLocaleString()}` },
        { status: 400 }
      );
    }

    const { data: inserted, error } = await supabase
      .from("withdrawal_requests")
      .insert({
        created_by: auth.userId,
        amount,
        currency: "KES",
        recipient_phone: phone,
        provider: "daraja",
        status: "pending_admin",
      })
      .select("id,amount,recipient_phone,status,created_at")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      id: inserted.id,
      amount: inserted.amount,
      recipient_phone: inserted.recipient_phone,
      status: inserted.status,
      created_at: inserted.created_at,
      message: "Withdrawal request submitted. An admin will review and approve it.",
    });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Request failed" },
      { status: 500 }
    );
  }
}
