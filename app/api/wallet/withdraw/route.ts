import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Creates a M-Pesa withdrawal request (status: pending_admin).
 * Admin must approve before B2C is executed.
 */
async function getAuthenticatedUser(req: Request): Promise<{ id: string } | null> {
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

  const { data: pm } = await supabase.from("portal_members").select("user_id").eq("user_id", user.id).maybeSingle();
  const { data: au } = !pm ? await supabase.from("admin_users").select("user_id").eq("user_id", user.id).maybeSingle() : { data: null };
  if (!pm && !au) return null;

  return { id: user.id };
}

export async function POST(req: Request) {
  const auth = await getAuthenticatedUser(req);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: req.headers.get("authorization") ? { headers: { Authorization: req.headers.get("authorization")! } } : {},
  });
  const supabaseAdmin = supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } })
    : null;

  try {
    // Verify user has payouts feature
    const { data: pm } = await supabase.from("portal_members").select("features,role").eq("user_id", auth.id).maybeSingle();
    const features = (pm?.features as string[] | null) ?? [];
    const isAdmin = pm?.role === "admin" || pm?.role === "manager";
    if (!isAdmin && !features.includes("payouts")) {
      return NextResponse.json({ error: "Payouts feature not enabled" }, { status: 403 });
    }

    // Get available M-Pesa balance
    let campaignsQuery = supabase.from("campaigns").select("id").eq("created_by", auth.id);
    const { data: campaigns } = await campaignsQuery;
    const campaignIds = (campaigns ?? []).map((c: { id: string }) => c.id);

    if (campaignIds.length === 0) {
      return NextResponse.json({ error: "No campaigns found. Balance is calculated from your campaign revenue." }, { status: 400 });
    }

    const { data: txRows } = await supabase
      .from("transactions")
      .select("amount,provider")
      .eq("status", "success")
      .in("campaign_id", campaignIds);

    let mpesaIn = 0;
    for (const t of txRows ?? []) {
      if (String(t.provider ?? "").toLowerCase() === "daraja") {
        mpesaIn += Number(t.amount ?? 0) || 0;
      }
    }

    const { data: withdrawals } = await supabase
      .from("withdrawal_requests")
      .select("amount,status")
      .eq("created_by", auth.id)
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
        created_by: auth.id,
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
