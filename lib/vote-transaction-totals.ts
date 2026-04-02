import type { SupabaseClient } from "@supabase/supabase-js";

import { fetchAllSupabasePages } from "@/lib/supabase-fetch-all-pages";

type TxRow = { contestant_id: string; quantity: number };

function aggregateTxRows(rows: TxRow[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const vr of rows) {
    const id = String(vr.contestant_id ?? "");
    const v = Number(vr.quantity ?? 0) || 0;
    if (!id) continue;
    out[id] = (out[id] ?? 0) + v;
  }
  return out;
}

function isMissingRpcError(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false;
  const msg = String(error.message ?? "");
  return (
    error.code === "42883" ||
    error.code === "PGRST202" ||
    msg.includes("Could not find the function") ||
    msg.includes("does not exist")
  );
}

async function fetchVoteTotalsPaged(supabase: SupabaseClient, campaignId: string): Promise<Record<string, number>> {
  const rows = await fetchAllSupabasePages(async (from, to) => {
    const r = await supabase
      .from("transactions")
      .select("contestant_id,quantity")
      .eq("campaign_id", campaignId)
      .eq("campaign_type", "vote")
      .eq("status", "success")
      .not("contestant_id", "is", null)
      .order("id", { ascending: true })
      .range(from, to);
    return { data: r.data as TxRow[] | null, error: r.error };
  });
  return aggregateTxRows(rows);
}

/** Successful vote transaction quantities per contestant (aligned with payment-backed totals). */
export async function getVoteTransactionTotalsByCampaign(
  supabase: SupabaseClient,
  campaignId: string
): Promise<Record<string, number>> {
  const { data, error } = await supabase.rpc("get_vote_transaction_totals_by_campaign", {
    p_campaign_id: campaignId,
  });
  if (!error && Array.isArray(data)) {
    const out: Record<string, number> = {};
    for (const row of data as { contestant_id: string; total_quantity: number | string }[]) {
      out[String(row.contestant_id)] = Number(row.total_quantity) || 0;
    }
    return out;
  }
  if (isMissingRpcError(error)) {
    return fetchVoteTotalsPaged(supabase, campaignId);
  }
  if (error) throw error;
  return {};
}

/** campaign_id → (contestant_id → total); used by voting catalog. */
export async function getVoteTransactionTotalsForCampaigns(
  supabase: SupabaseClient,
  campaignIds: string[]
): Promise<Map<string, Map<string, number>>> {
  if (campaignIds.length === 0) return new Map();

  const { data, error } = await supabase.rpc("get_vote_transaction_totals_for_campaigns", {
    p_campaign_ids: campaignIds,
  });

  if (!error && Array.isArray(data)) {
    const out = new Map<string, Map<string, number>>();
    for (const row of data as {
      campaign_id: string;
      contestant_id: string;
      total_quantity: number | string;
    }[]) {
      const cid = String(row.campaign_id);
      const conid = String(row.contestant_id);
      const v = Number(row.total_quantity) || 0;
      let inner = out.get(cid);
      if (!inner) {
        inner = new Map();
        out.set(cid, inner);
      }
      inner.set(conid, v);
    }
    return out;
  }

  if (isMissingRpcError(error)) {
    const pairs = await Promise.all(
      campaignIds.map(async (id) => {
        const rec = await fetchVoteTotalsPaged(supabase, id);
        return [id, new Map(Object.entries(rec))] as const;
      })
    );
    return new Map(pairs);
  }

  if (error) throw error;
  return new Map();
}

/** Flat contestant_id → total for sorting (contestant ids are unique across campaigns). */
export async function getVoteTransactionTotalsForCampaignsFlat(
  supabase: SupabaseClient,
  campaignIds: string[]
): Promise<Map<string, number>> {
  const nested = await getVoteTransactionTotalsForCampaigns(supabase, campaignIds);
  const flat = new Map<string, number>();
  for (const m of nested.values()) {
    for (const [conId, v] of m) {
      flat.set(conId, v);
    }
  }
  return flat;
}
