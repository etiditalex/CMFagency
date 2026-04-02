import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { fetchAllSupabasePages } from "@/lib/supabase-fetch-all-pages";

export const dynamic = "force-dynamic";

const LOOKBACK_DAYS = 90;
const DAILY_CHART_DAYS = 14;

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

async function canAccessReports(
  supabase: ReturnType<typeof createClient<any>>,
  userId: string
): Promise<boolean> {
  const { data: pmRaw } = await supabase
    .from("portal_members")
    .select("role,features")
    .eq("user_id", userId)
    .maybeSingle();
  const pm = pmRaw as { role: string; features: unknown } | null;
  if (pm) {
    if (pm.role === "admin" || pm.role === "manager") return true;
    const feats = pm.features as string[] | null | undefined;
    if (Array.isArray(feats) && feats.includes("reports")) return true;
    return false;
  }
  const { data: au } = await supabase.from("admin_users").select("user_id").eq("user_id", userId).maybeSingle();
  return !!au;
}

/**
 * Aggregates successful payments for dashboard charts (votes vs tickets, daily vote/ticket revenue, providers).
 * Same campaign scope as Transactions: full admin sees all campaigns; others see `created_by = self`.
 */
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace(/^Bearer\s+/i, "")?.trim() ?? "";
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: userData, error: userErr } = await supabase.auth.getUser(token);
  if (userErr || !userData?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = userData.user.id;
  if (!(await canAccessReports(supabase, userId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let isFullAdmin = false;
  const { data: pmRow } = await supabase.from("portal_members").select("role").eq("user_id", userId).maybeSingle();
  if (pmRow?.role === "admin") isFullAdmin = true;
  else if (!pmRow) {
    const { data: au } = await supabase.from("admin_users").select("user_id").eq("user_id", userId).maybeSingle();
    if (au) isFullAdmin = true;
  }

  let campaignsQuery = supabase.from("campaigns").select("id,title,slug,type").order("created_at", { ascending: false });
  if (!isFullAdmin) {
    campaignsQuery = campaignsQuery.eq("created_by", userId);
  }

  const { data: campaigns, error: cErr } = await campaignsQuery;
  if (cErr) {
    return NextResponse.json({ error: cErr.message }, { status: 500 });
  }

  const rows = campaigns ?? [];
  const campaignIds = rows.map((c: { id: string }) => c.id);
  const merchandiseId =
    (rows as { id: string; slug?: string }[]).find((c) => String(c.slug ?? "").toLowerCase() === "merchandise")?.id ??
    null;

  if (campaignIds.length === 0) {
    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      campaignCount: 0,
      kpis: {
        successfulPayments: 0,
        voteRevenue: 0,
        ticketRevenue: 0,
        merchandiseRevenue: 0,
        voteUnits: 0,
        paystackRevenue: 0,
        mpesaRevenue: 0,
      },
      pie: { vote: 0, ticket: 0, merchandise: 0 },
      daily: [],
      topVoteCampaigns: [],
    });
  }

  const since = new Date();
  since.setUTCDate(since.getUTCDate() - LOOKBACK_DAYS);

  let txRows: {
    amount: number;
    currency: string;
    campaign_type: string;
    campaign_id: string;
    provider: string | null;
    quantity: number;
    created_at: string;
  }[];
  try {
    txRows = await fetchAllSupabasePages(async (from, to) => {
      const r = await supabase
        .from("transactions")
        .select("amount,currency,campaign_type,campaign_id,provider,quantity,created_at,status")
        .eq("status", "success")
        .in("campaign_id", campaignIds)
        .gte("created_at", since.toISOString())
        .order("id", { ascending: true })
        .range(from, to);
      return { data: r.data as typeof txRows | null, error: r.error };
    });
  } catch (e: unknown) {
    const msg = e && typeof e === "object" && "message" in e ? String((e as { message: string }).message) : "query failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  const txs = txRows;

  let voteRevenue = 0;
  let ticketRevenue = 0;
  let merchandiseRevenue = 0;
  let voteUnits = 0;
  let paystackRevenue = 0;
  let mpesaRevenue = 0;

  const voteByCampaign = new Map<string, { revenue: number; units: number; count: number }>();
  type DailyBucket = { voteRevenue: number; voteUnits: number; ticketRevenue: number };
  const dailyMap = new Map<string, DailyBucket>();

  // Last N calendar days including today (UTC).
  const chartStart = new Date();
  chartStart.setUTCDate(chartStart.getUTCDate() - (DAILY_CHART_DAYS - 1));
  for (let i = 0; i < DAILY_CHART_DAYS; i++) {
    const d = new Date(chartStart);
    d.setUTCDate(d.getUTCDate() + i);
    dailyMap.set(ymd(d), { voteRevenue: 0, voteUnits: 0, ticketRevenue: 0 });
  }

  const isMpesa = (p: string | null | undefined) => {
    const s = String(p ?? "").toLowerCase();
    return s === "daraja" || s.includes("mpesa") || s.includes("m-pesa");
  };

  for (const t of txs) {
    const amt = Number(t.amount ?? 0);
    if (!Number.isFinite(amt)) continue;
    const ctype = String(t.campaign_type ?? "").toLowerCase();
    const isMerch = merchandiseId && String(t.campaign_id) === String(merchandiseId);

    if (isMerch) {
      merchandiseRevenue += amt;
    } else if (ctype === "vote") {
      voteRevenue += amt;
      const qRaw = Math.trunc(Number(t.quantity ?? 0));
      const q = qRaw > 0 ? qRaw : 1;
      voteUnits += q;
      const day = ymd(new Date(t.created_at));
      const agg = dailyMap.get(day);
      if (agg) {
        agg.voteRevenue += amt;
        agg.voteUnits += q;
      }
      const key = String(t.campaign_id);
      const cur = voteByCampaign.get(key) ?? { revenue: 0, units: 0, count: 0 };
      cur.revenue += amt;
      cur.units += q;
      cur.count += 1;
      voteByCampaign.set(key, cur);
    } else if (ctype === "ticket") {
      ticketRevenue += amt;
      const day = ymd(new Date(t.created_at));
      const agg = dailyMap.get(day);
      if (agg) {
        agg.ticketRevenue += amt;
      }
    }

    if (isMpesa(t.provider)) mpesaRevenue += amt;
    else paystackRevenue += amt;
  }

  const pie = {
    vote: Math.round(voteRevenue),
    ticket: Math.round(ticketRevenue),
    merchandise: Math.round(merchandiseRevenue),
  };

  const daily = [...dailyMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({
      date,
      voteRevenue: Math.round(v.voteRevenue),
      voteUnits: v.voteUnits,
      ticketRevenue: Math.round(v.ticketRevenue),
    }));

  const titleById: Record<string, string> = {};
  for (const c of rows as { id: string; title?: string; slug?: string }[]) {
    titleById[c.id] = String(c.title || c.slug || c.id);
  }

  const topVoteCampaigns = [...voteByCampaign.entries()]
    .map(([id, v]) => ({
      campaignId: id,
      title: titleById[id] ?? id,
      revenue: Math.round(v.revenue),
      voteUnits: v.units,
      successfulPayments: v.count,
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 15);

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    campaignCount: campaignIds.length,
    kpis: {
      successfulPayments: txs.length,
      voteRevenue: Math.round(voteRevenue),
      ticketRevenue: Math.round(ticketRevenue),
      merchandiseRevenue: Math.round(merchandiseRevenue),
      voteUnits: Math.round(voteUnits),
      paystackRevenue: Math.round(paystackRevenue),
      mpesaRevenue: Math.round(mpesaRevenue),
    },
    pie,
    daily,
    topVoteCampaigns,
  });
}
