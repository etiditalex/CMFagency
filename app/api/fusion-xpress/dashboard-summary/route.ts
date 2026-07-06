import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { requireFusionPortalInvoiceAccess } from "@/lib/fusion-require-admin";
import { fetchAllSupabasePages } from "@/lib/supabase-fetch-all-pages";

export const dynamic = "force-dynamic";

type MetricsRollup = {
  currency?: unknown;
  resolved_type?: unknown;
  campaign_id?: unknown;
  amount_sum?: unknown;
  amount?: unknown;
  qty_effective_sum?: unknown;
};

type ReportableRow = {
  amount?: unknown;
  currency?: unknown;
  resolved_type?: unknown;
  campaign_id?: unknown;
  quantity?: unknown;
};

function parsePortalFeatures(raw: unknown): string[] {
  return Array.isArray(raw) ? raw.map((f) => String(f).toLowerCase().trim()) : [];
}

function rollupMetrics(
  metricsJson: unknown,
  merchandiseCampaignId: string | null,
  campaignIds: string[]
) {
  const rev: Record<string, number> = {};
  const revTickets: Record<string, number> = {};
  const revVotes: Record<string, number> = {};
  const revMerchandise: Record<string, number> = {};
  let voteUnits = 0;
  let ticketUnits = 0;
  let successPaymentCount = 0;

  if (metricsJson && typeof metricsJson === "object") {
    const m = metricsJson as { successful_count?: number | string; rollups?: unknown };
    successPaymentCount = Math.trunc(Number(m.successful_count ?? 0)) || 0;
    const rollups = Array.isArray(m.rollups) ? (m.rollups as MetricsRollup[]) : [];
    for (const t of rollups) {
      const cur = String(t.currency ?? "").toUpperCase() || "—";
      const amt = Number(t.amount_sum ?? t.amount ?? 0);
      const ctype = String(t.resolved_type ?? "").toLowerCase();
      const qtyEff = Math.trunc(Number(t.qty_effective_sum ?? 0));
      const isMerchandise = merchandiseCampaignId && String(t.campaign_id ?? "") === String(merchandiseCampaignId);
      if (!Number.isFinite(amt)) continue;
      rev[cur] = (rev[cur] ?? 0) + amt;
      if (isMerchandise) {
        revMerchandise[cur] = (revMerchandise[cur] ?? 0) + amt;
      } else if (ctype === "vote") {
        revVotes[cur] = (revVotes[cur] ?? 0) + amt;
        voteUnits += qtyEff > 0 ? qtyEff : 0;
      } else if (ctype === "ticket") {
        revTickets[cur] = (revTickets[cur] ?? 0) + amt;
        ticketUnits += qtyEff > 0 ? qtyEff : 0;
      }
    }
    return { rev, revTickets, revVotes, revMerchandise, voteUnits, ticketUnits, successPaymentCount };
  }

  return null;
}

async function fallbackMetrics(
  supabase: ReturnType<typeof createClient<any>>,
  campaignIds: string[],
  merchandiseCampaignId: string | null
) {
  const successRows = await fetchAllSupabasePages(async (from, to) => {
    const r = await supabase
      .from("reportable_transactions")
      .select("amount,currency,resolved_type,campaign_id,quantity")
      .eq("status", "success")
      .in("campaign_id", campaignIds)
      .order("id", { ascending: true })
      .range(from, to);
    return { data: r.data as ReportableRow[] | null, error: r.error };
  });

  const rev: Record<string, number> = {};
  const revTickets: Record<string, number> = {};
  const revVotes: Record<string, number> = {};
  const revMerchandise: Record<string, number> = {};
  let voteUnits = 0;
  let ticketUnits = 0;

  for (const t of successRows) {
    const cur = String(t.currency ?? "").toUpperCase() || "—";
    const amt = Number(t.amount ?? 0);
    const ctype = String(t.resolved_type ?? "").toLowerCase();
    const qtyRaw = Math.trunc(Number(t.quantity ?? 0));
    const qty = qtyRaw > 0 ? qtyRaw : 1;
    const isMerchandise = merchandiseCampaignId && String(t.campaign_id ?? "") === String(merchandiseCampaignId);
    if (!Number.isFinite(amt)) continue;
    rev[cur] = (rev[cur] ?? 0) + amt;
    if (isMerchandise) {
      revMerchandise[cur] = (revMerchandise[cur] ?? 0) + amt;
    } else if (ctype === "vote") {
      revVotes[cur] = (revVotes[cur] ?? 0) + amt;
      voteUnits += qty;
    } else if (ctype === "ticket") {
      revTickets[cur] = (revTickets[cur] ?? 0) + amt;
      ticketUnits += qty;
    }
  }

  return {
    rev,
    revTickets,
    revVotes,
    revMerchandise,
    voteUnits,
    ticketUnits,
    successPaymentCount: successRows.length,
  };
}

async function loadKcmSummary(admin: ReturnType<typeof createClient<any>>) {
  const [{ data: paidMemberships, error: mErr }, { data: walletRows, error: wErr }] = await Promise.all([
    admin
      .from("kcm_memberships")
      .select("payment_amount_kes")
      .or("payment_status.eq.success,payment_confirmed.eq.true"),
    admin.from("kcm_member_wallet_transactions").select("amount_kes").eq("status", "success"),
  ]);

  if (mErr || wErr) return null;

  let totalMembershipPaidKes = 0;
  let membershipPaidCount = 0;
  for (const row of (paidMemberships ?? []) as Array<{ payment_amount_kes?: number | null }>) {
    const amount = Number(row.payment_amount_kes ?? 0);
    if (!Number.isFinite(amount) || amount <= 0) continue;
    totalMembershipPaidKes += amount;
    membershipPaidCount += 1;
  }

  let totalContributionKes = 0;
  for (const row of (walletRows ?? []) as Array<{ amount_kes?: number | null }>) {
    const amount = Number(row.amount_kes ?? 0);
    if (!Number.isFinite(amount) || amount <= 0) continue;
    totalContributionKes += amount;
  }

  return { totalMembershipPaidKes, membershipPaidCount, totalContributionKes };
}

/**
 * Single round-trip dashboard payload: campaigns, KPI rollups, recent transactions.
 * Uses the caller's JWT so Supabase RLS matches the existing client-side dashboard.
 */
export async function GET(req: NextRequest) {
  const auth = await requireFusionPortalInvoiceAccess(req);
  if ("error" in auth) return auth.error;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() ?? "";
  const supabase = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: memberRow } = await auth.admin
    .from("portal_members")
    .select("role,features")
    .eq("user_id", auth.userId)
    .maybeSingle();
  const role = String((memberRow as { role?: string } | null)?.role ?? "").toLowerCase();
  const isLegacyAdmin = !memberRow
    ? (await auth.admin.from("admin_users").select("user_id").eq("user_id", auth.userId).maybeSingle()).data != null
    : false;
  const isAdminOrManager = role === "admin" || role === "manager" || isLegacyAdmin;
  const features = parsePortalFeatures((memberRow as { features?: unknown } | null)?.features);
  const hasKcmMembership = isAdminOrManager || features.includes("kcm_membership");

  const [{ data: campaigns, error: cErr }, kcmSummary, pendingJobApplications] = await Promise.all([
    supabase
      .from("campaigns")
      .select("id,title,type,slug,is_active,created_at")
      .order("created_at", { ascending: false }),
    hasKcmMembership ? loadKcmSummary(auth.admin) : Promise.resolve(null),
    isAdminOrManager
      ? auth.admin
          .from("applications")
          .select("id", { count: "exact", head: true })
          .eq("status", "pending")
          .then(({ count }) => count ?? 0)
      : Promise.resolve(0),
  ]);

  if (cErr) return NextResponse.json({ error: cErr.message }, { status: 500 });

  const rows = campaigns ?? [];
  const campaignIds = rows.map((c) => String((c as { id: string }).id));
  const merchandiseCampaignId =
    rows.find((c) => String((c as { slug?: string }).slug ?? "").toLowerCase() === "merchandise")?.id ?? null;
  const campaignRowsExcludingMerchandise = rows.filter(
    (c) => String((c as { slug?: string }).slug ?? "").toLowerCase() !== "merchandise"
  );

  const titleMap: Record<string, { title: string; type: string }> = {};
  for (const c of rows) {
    const row = c as { id: string; title?: string; type?: string };
    titleMap[String(row.id)] = {
      title: String(row.title ?? "Untitled campaign"),
      type: String(row.type ?? ""),
    };
  }

  let recentTransactions: Array<{
    id: string;
    reference: string;
    status: string;
    amount: number;
    currency: string;
    created_at: string;
    campaign_id: string;
    provider?: string;
    email?: string | null;
    payer_name?: string | null;
  }> = [];

  let successfulPayments = 0;
  let revenueByCurrency: Record<string, number> = {};
  let revenueByCurrencyTickets: Record<string, number> = {};
  let revenueByCurrencyVotes: Record<string, number> = {};
  let revenueByCurrencyMerchandise: Record<string, number> = {};
  let totalVotes = 0;
  let totalTicketsIssued = 0;

  if (campaignIds.length > 0) {
    const [{ data: txData, error: txErr }, { data: metricsJson, error: metricsErr }] = await Promise.all([
      supabase
        .from("transactions")
        .select("id,reference,status,amount,currency,created_at,campaign_id,provider,email,payer_name")
        .order("created_at", { ascending: false })
        .limit(10),
      supabase.rpc("dashboard_reportable_success_metrics", {
        p_campaign_ids: campaignIds,
      }),
    ]);

    if (txErr) return NextResponse.json({ error: txErr.message }, { status: 500 });

    const rawTx = (txData ?? []) as typeof recentTransactions;
    recentTransactions = isAdminOrManager
      ? rawTx
      : rawTx.filter((t) => t.status !== "failed" && t.status !== "abandoned");

    const rolled = !metricsErr ? rollupMetrics(metricsJson, merchandiseCampaignId, campaignIds) : null;
    const metrics = rolled ?? (await fallbackMetrics(supabase, campaignIds, merchandiseCampaignId));

    successfulPayments = metrics.successPaymentCount;
    revenueByCurrency = metrics.rev;
    revenueByCurrencyTickets = metrics.revTickets;
    revenueByCurrencyVotes = metrics.revVotes;
    revenueByCurrencyMerchandise = metrics.revMerchandise;
    totalVotes = metrics.voteUnits;
    totalTicketsIssued = metrics.ticketUnits;
  }

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    campaignsCount: campaignRowsExcludingMerchandise.length,
    activeCampaignsCount: campaignRowsExcludingMerchandise.filter((c) => (c as { is_active?: boolean }).is_active).length,
    inactiveCampaignsCount: campaignRowsExcludingMerchandise.filter((c) => !(c as { is_active?: boolean }).is_active)
      .length,
    campaignTitleById: titleMap,
    recentTransactions,
    successfulPayments,
    revenueByCurrency,
    revenueByCurrencyTickets,
    revenueByCurrencyVotes,
    revenueByCurrencyMerchandise,
    totalVotes,
    totalTicketsIssued,
    kcmSummary,
    pendingJobApplications,
  });
}
