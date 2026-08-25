import type { SupabaseClient } from "@supabase/supabase-js";

import { fetchAllSupabasePages } from "@/lib/supabase-fetch-all-pages";

export type CampaignFinancials = {
  total_amount: number;
  total_votes: number;
  successful_transactions: number;
};

type ReportableRow = {
  campaign_id?: unknown;
  amount?: unknown;
  quantity?: unknown;
  resolved_type?: unknown;
};

type MetricsRollup = {
  campaign_id?: unknown;
  resolved_type?: unknown;
  amount_sum?: unknown;
  amount?: unknown;
  qty_effective_sum?: unknown;
};

/**
 * Per-campaign money and vote units from the same source as the Fusion Xpress home
 * dashboard and Sales & votes page: successful `reportable_transactions`.
 *
 * Do not use `campaign_stats.total_amount` / `total_votes` for these KPIs. That view
 * joins transactions to votes, so each payment is multiplied by every vote row.
 */
export async function loadCampaignReportableFinancials(
  supabase: SupabaseClient,
  campaignIds: string[]
): Promise<Map<string, CampaignFinancials>> {
  const out = new Map<string, CampaignFinancials>();
  for (const id of campaignIds) {
    out.set(id, { total_amount: 0, total_votes: 0, successful_transactions: 0 });
  }
  if (campaignIds.length === 0) return out;

  const applyRows = (rows: ReportableRow[]) => {
    const counts = new Map<string, number>();
    for (const t of rows) {
      const id = String(t.campaign_id ?? "");
      const cur = out.get(id);
      if (!cur) continue;
      const amt = Number(t.amount ?? 0);
      const qtyRaw = Math.trunc(Number(t.quantity ?? 0));
      const qty = qtyRaw > 0 ? qtyRaw : 1;
      const ctype = String(t.resolved_type ?? "").toLowerCase();
      if (Number.isFinite(amt)) cur.total_amount += amt;
      if (ctype === "vote") cur.total_votes += qty;
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    for (const [id, n] of counts) {
      const cur = out.get(id);
      if (cur) cur.successful_transactions = n;
    }
  };

  const { data, error } = await supabase.rpc("dashboard_reportable_success_metrics", {
    p_campaign_ids: campaignIds,
  });

  if (!error && data && typeof data === "object") {
    const rollups = Array.isArray((data as { rollups?: unknown }).rollups)
      ? ((data as { rollups: MetricsRollup[] }).rollups)
      : [];
    for (const t of rollups) {
      const id = String(t.campaign_id ?? "");
      const cur = out.get(id);
      if (!cur) continue;
      const amt = Number(t.amount_sum ?? t.amount ?? 0);
      const qty = Math.trunc(Number(t.qty_effective_sum ?? 0));
      const ctype = String(t.resolved_type ?? "").toLowerCase();
      if (Number.isFinite(amt)) cur.total_amount += amt;
      if (ctype === "vote" && qty > 0) cur.total_votes += qty;
    }

    const { data: countRows, error: countErr } = await supabase
      .from("campaign_stats")
      .select("campaign_id,successful_transactions")
      .in("campaign_id", campaignIds);
    if (!countErr) {
      for (const row of countRows ?? []) {
        const id = String((row as { campaign_id?: string }).campaign_id ?? "");
        const cur = out.get(id);
        if (!cur) continue;
        cur.successful_transactions =
          Number((row as { successful_transactions?: number }).successful_transactions ?? 0) || 0;
      }
    }
    return out;
  }

  const rows = await fetchAllSupabasePages(async (from, to) => {
    const r = await supabase
      .from("reportable_transactions")
      .select("campaign_id,amount,quantity,resolved_type")
      .eq("status", "success")
      .in("campaign_id", campaignIds)
      .order("id", { ascending: true })
      .range(from, to);
    return { data: r.data as ReportableRow[] | null, error: r.error };
  });
  applyRows(rows);
  return out;
}
