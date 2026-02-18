"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Download, ExternalLink, Loader2, RefreshCw } from "lucide-react";

import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { usePortal } from "@/contexts/PortalContext";

type TxRow = {
  id: string;
  reference: string;
  status: string;
  amount: number;
  currency: string;
  quantity: number;
  created_at: string;
  campaign_id: string;
  campaign_type: string;
  provider?: string;
  email?: string | null;
  payer_name?: string | null;
};

export default function TransactionsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { isPortalMember, loading: portalLoading, hasFeature, isFullAdmin } = usePortal();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<TxRow[]>([]);
  const [campaignTitleById, setCampaignTitleById] = useState<Record<string, string>>({});
  const [downloading, setDownloading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const PAGE_SIZE = 100;

  const refreshData = useCallback(async (offset = 0, append = false) => {
    if (!user?.id) return;

    if (offset === 0) setLoading(true);
    else setLoadingMore(true);
    setError(null);

    try {
      let campaignsQuery = supabase
        .from("campaigns")
        .select("id,title,slug")
        .order("created_at", { ascending: false });

      if (!isFullAdmin) {
        campaignsQuery = campaignsQuery.eq("created_by", user.id);
      }

      const { data: campaigns, error: cErr } = await campaignsQuery;
      if (cErr) throw cErr;

      const campaignIds = (campaigns ?? []).map((c: { id: string }) => c.id);
      const titleMap: Record<string, string> = {};
      for (const c of (campaigns ?? []) as Array<{ id: string; title?: string; slug?: string }>) {
        titleMap[c.id] = String(c.title || c.slug || c.id);
      }
      setCampaignTitleById(titleMap);

      if (campaignIds.length === 0) {
        setTransactions([]);
        setHasMore(false);
        return;
      }

      const { data: txRows, error: txErr } = await supabase
        .from("transactions")
        .select("id,reference,status,amount,currency,quantity,created_at,campaign_id,campaign_type,provider,email,payer_name")
        .in("campaign_id", campaignIds)
        .order("created_at", { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1);

      if (txErr) throw txErr;

      const rows = (txRows ?? []) as TxRow[];
      setTransactions((prev) => (append ? [...prev, ...rows] : rows));
      setHasMore(rows.length === PAGE_SIZE);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to load transactions";
      setError(msg);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [user?.id, isFullAdmin]);

  useEffect(() => {
    if (authLoading || portalLoading) return;
    if (!user || !isPortalMember) {
      router.replace("/fusion-xpress");
      return;
    }
    if (!hasFeature("reports")) {
      router.replace("/dashboard/campaigns");
      return;
    }

    refreshData(0, false);
  }, [authLoading, portalLoading, user, isPortalMember, hasFeature, router, refreshData]);

  const loadMore = () => {
    const nextOffset = transactions.length;
    refreshData(nextOffset, true);
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        setError("Not logged in");
        return;
      }
      const res = await fetch("/api/transactions/export", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? `Download failed (${res.status})`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `transactions-reconciliation-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Download failed");
    } finally {
      setDownloading(false);
    }
  };

  if (authLoading || portalLoading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">All Transactions</h2>
          <p className="mt-1 text-sm text-gray-600">
            View and download all transactions for reconciliation.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => refreshData(0, false)}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-gray-200 bg-white hover:bg-gray-50 font-semibold text-gray-900 disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary-600 text-white font-semibold hover:bg-primary-700 disabled:opacity-60"
          >
            <Download className={`w-4 h-4 ${downloading ? "animate-spin" : ""}`} />
            {downloading ? "Preparing…" : "Download CSV"}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700">
          {error}
        </div>
      )}

      <div className="bg-white rounded-md shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-auto max-h-[70vh]">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
              <tr className="text-left">
                <th className="px-6 py-3 font-bold text-gray-600">Date</th>
                <th className="px-6 py-3 font-bold text-gray-600">Payer</th>
                <th className="px-6 py-3 font-bold text-gray-600">Campaign</th>
                <th className="px-6 py-3 font-bold text-gray-600">Type</th>
                <th className="px-6 py-3 font-bold text-gray-600">Reference</th>
                <th className="px-6 py-3 font-bold text-gray-600">Amount</th>
                <th className="px-6 py-3 font-bold text-gray-600">Qty</th>
                <th className="px-6 py-3 font-bold text-gray-600">Provider</th>
                <th className="px-6 py-3 font-bold text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-gray-500">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                    Loading transactions…
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-gray-500">
                    No transactions yet.
                  </td>
                </tr>
              ) : (
                transactions.map((t) => {
                  const status = String(t.status ?? "");
                  const statusClass =
                    status === "success"
                      ? "text-green-700 bg-green-50 border-green-100"
                      : status === "failed"
                        ? "text-red-700 bg-red-50 border-red-100"
                        : "text-gray-700 bg-gray-50 border-gray-100";
                  const payerDisplay = t.payer_name?.trim()
                    ? String(t.payer_name).trim()
                    : t.email?.trim()
                      ? String(t.email)
                      : "—";

                  return (
                    <tr key={t.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                      <td className="px-6 py-4 text-gray-700 whitespace-nowrap">
                        {new Date(t.created_at).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-gray-900 font-medium max-w-[160px] truncate" title={t.email ?? undefined}>
                        {payerDisplay}
                      </td>
                      <td className="px-6 py-4 text-gray-900 font-semibold max-w-[180px] truncate">
                        {campaignTitleById[t.campaign_id] ?? "—"}
                      </td>
                      <td className="px-6 py-4 text-gray-700 whitespace-nowrap">
                        {t.campaign_type === "vote" ? "Vote" : "Ticket"}
                      </td>
                      <td className="px-6 py-4 text-gray-700 font-mono text-xs whitespace-nowrap">
                        {t.reference}
                      </td>
                      <td className="px-6 py-4 text-gray-900 whitespace-nowrap">
                        {String(t.currency ?? "").toUpperCase()} {Number(t.amount ?? 0).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-gray-700 whitespace-nowrap">{t.quantity}</td>
                      <td className="px-6 py-4 text-gray-600 whitespace-nowrap">{t.provider ?? "—"}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-3 py-1 rounded-full border text-xs font-bold ${statusClass}`}>
                          {status || "—"}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {hasMore && transactions.length > 0 && (
          <div className="p-4 border-t border-gray-200 bg-gray-50 text-center">
            <button
              type="button"
              onClick={loadMore}
              disabled={loadingMore}
              className="inline-flex items-center gap-2 px-6 py-2 rounded-md border border-gray-200 bg-white hover:bg-gray-50 font-semibold text-gray-700 disabled:opacity-60"
            >
              {loadingMore ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading…
                </>
              ) : (
                "Load more"
              )}
            </button>
          </div>
        )}
      </div>

      <p className="text-sm text-gray-500">
        <Link href="/dashboard" className="text-primary-600 hover:underline inline-flex items-center gap-1">
          <ExternalLink className="w-4 h-4" />
          Back to Dashboard
        </Link>
      </p>
    </div>
  );
}
