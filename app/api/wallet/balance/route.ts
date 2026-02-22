import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Returns wallet balance split by M-Pesa (Daraja) and Paystack.
 * Requires authenticated portal member.
 */
async function getAuthenticatedUser(req: Request): Promise<{ id: string; isAdmin: boolean } | null> {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace(/^Bearer\s+/i, "");
  if (!token) return null;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) return null;

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;

  const { data: pm } = await supabase.from("portal_members").select("role").eq("user_id", user.id).maybeSingle();
  const isAdmin = pm?.role === "admin" || pm?.role === "manager";
  const isPortal = !!pm;
  const { data: au } = !isPortal ? await supabase.from("admin_users").select("user_id").eq("user_id", user.id).maybeSingle() : { data: null };
  if (!pm && !au) return null;

  return { id: user.id, isAdmin: isAdmin || !!au };
}

export async function GET(req: Request) {
  const auth = await getAuthenticatedUser(req);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: req.headers.get("authorization") ? { headers: { Authorization: req.headers.get("authorization")! } } : {},
  });

  try {
    // Campaign IDs: always user's own campaigns (balance is per-user)
    const { data: campaigns, error: cErr } = await supabase
      .from("campaigns")
      .select("id")
      .eq("created_by", auth.id);
    if (cErr) throw cErr;
    const campaignIds = (campaigns ?? []).map((c: { id: string }) => c.id);

    if (campaignIds.length === 0) {
      return NextResponse.json({
        mpesa: 0,
        paystack: 0,
        mpesaAvailable: 0,
      });
    }

    // Sum successful transactions by provider
    const { data: txRows, error: txErr } = await supabase
      .from("transactions")
      .select("amount,provider")
      .eq("status", "success")
      .in("campaign_id", campaignIds);

    if (txErr) throw txErr;

    let mpesa = 0;
    let paystack = 0;
    for (const t of txRows ?? []) {
      const amt = Number(t.amount ?? 0) || 0;
      if (String(t.provider ?? "").toLowerCase() === "daraja") {
        mpesa += amt;
      } else {
        paystack += amt;
      }
    }

    // Pending M-Pesa withdrawals (reduce available) - use supabase (RLS allows own rows)
    const { data: withdrawals } = await supabase
      .from("withdrawal_requests")
      .select("amount,status")
      .eq("created_by", auth.id)
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
