"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ExternalLink,
  Plus,
  RefreshCw,
  Shield,
  Ticket,
  Vote,
  Wallet,
} from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { usePortal } from "@/contexts/PortalContext";
import { supabase } from "@/lib/supabase";

function isMissingPortalMembersTable(err: any) {
  const msg = String(err?.message ?? "");
  const code = String(err?.code ?? "");
  return code === "42P01" || (msg.includes("portal_members") && msg.includes("does not exist"));
}

export default function DashboardHomePage() {
  const router = useRouter();
  const { isAuthenticated, user, loading: authLoading } = useAuth();
  const { isPortalMember, loading: portalLoading, isFullAdmin, isManager, hasFeature } = usePortal();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dataLoading, setDataLoading] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
  const [campaignsCount, setCampaignsCount] = useState(0);
  const [activeCampaignsCount, setActiveCampaignsCount] = useState(0);
  const [inactiveCampaignsCount, setInactiveCampaignsCount] = useState(0);
  const [totalVotes, setTotalVotes] = useState(0);
  const [totalTicketsIssued, setTotalTicketsIssued] = useState(0);
  const [successfulPayments, setSuccessfulPayments] = useState(0);
  const [revenueByCurrency, setRevenueByCurrency] = useState<Record<string, number>>({});
  const [recentTransactions, setRecentTransactions] = useState<
    Array<{
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
    }>
  >([]);
  const [campaignTitleById, setCampaignTitleById] = useState<Record<string, { title: string; type: string }>>({});

  const refreshInFlightRef = useRef(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ updated?: number; error?: string } | null>(null);

  const formatRevenue = useMemo(() => {
    const entries = Object.entries(revenueByCurrency).filter(([, v]) => Number.isFinite(v) && v > 0);
    if (entries.length === 0) return "—";
    if (entries.length === 1) {
      const [cur, amt] = entries[0];
      return `${cur} ${Number(amt).toLocaleString()}`;
    }
    // Multi-currency: compact list.
    return entries
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([cur, amt]) => `${cur} ${Number(amt).toLocaleString()}`)
      .join(" · ");
  }, [revenueByCurrency]);

  const refreshData = useCallback(async () => {
    if (!user?.id) return;
    if (refreshInFlightRef.current) return;
    refreshInFlightRef.current = true;

    setDataLoading(true);
    setError(null);

    try {
      // Campaigns: total + active/inactive + title lookup for transactions list.
      // Only full admins see all campaigns; managers and clients see only their own.
      let campaignsQuery = supabase
        .from("campaigns")
        .select("id,title,type,is_active,created_at")
        .order("created_at", { ascending: false });

      if (!isFullAdmin && user?.id) {
        campaignsQuery = campaignsQuery.eq("created_by", user.id);
      }

      const { data: campaigns, error: cErr } = await campaignsQuery;

      if (cErr) throw cErr;

      const rows = campaigns ?? [];
      const campaignIds = (rows as any[]).map((c) => c.id);
      setCampaignsCount(rows.length);
      setActiveCampaignsCount(rows.filter((c) => c.is_active).length);
      setInactiveCampaignsCount(rows.filter((c) => !c.is_active).length);

      const titleMap: Record<string, { title: string; type: string }> = {};
      for (const c of rows as any[]) {
        titleMap[String(c.id)] = { title: String(c.title ?? "Untitled campaign"), type: String(c.type ?? "") };
      }
      setCampaignTitleById(titleMap);

      // For clients, filter transactions/votes/tickets by their campaigns only.
      // When client has no campaigns, return empty (don't run unfiltered queries).
      const hasCampaigns = campaignIds.length > 0;

      if (!hasCampaigns) {
        setRecentTransactions([]);
        setSuccessfulPayments(0);
        setRevenueByCurrency({});
        setTotalVotes(0);
        setTotalTicketsIssued(0);
      } else {
        // Recent transactions (money report). Include payer identity for admin visibility.
        const { data: txRows, error: txErr } = await supabase
          .from("transactions")
          .select("id,reference,status,amount,currency,created_at,campaign_id,provider,email,payer_name")
          .in("campaign_id", campaignIds)
          .order("created_at", { ascending: false })
          .limit(10);
        if (txErr) throw txErr;
        setRecentTransactions((txRows ?? []) as any[]);

        // Successful payments + revenue
        const { data: successTx, error: sErr } = await supabase
          .from("transactions")
          .select("amount,currency")
          .eq("status", "success")
          .in("campaign_id", campaignIds);
        if (sErr) throw sErr;
        setSuccessfulPayments((successTx ?? []).length);
        const rev: Record<string, number> = {};
        for (const t of (successTx ?? []) as any[]) {
          const cur = String(t.currency ?? "").toUpperCase() || "—";
          const amt = Number(t.amount ?? 0);
          if (!Number.isFinite(amt)) continue;
          rev[cur] = (rev[cur] ?? 0) + amt;
        }
        setRevenueByCurrency(rev);

        // Votes: real-time total (idempotent via votes table)
        const { data: voteRows, error: vErr } = await supabase
          .from("votes")
          .select("votes,campaign_id")
          .in("campaign_id", campaignIds);
        if (vErr) throw vErr;
        setTotalVotes(
          (voteRows ?? []).reduce((acc: number, r: any) => acc + (Number(r.votes ?? 0) || 0), 0)
        );

        // Tickets issued: real-time total (idempotent via ticket_issues table)
        const { data: tiRows, error: tiErr } = await supabase
          .from("ticket_issues")
          .select("quantity,campaign_id")
          .in("campaign_id", campaignIds);
        if (tiErr) throw tiErr;
        setTotalTicketsIssued(
          (tiRows ?? []).reduce((acc: number, r: any) => acc + (Number(r.quantity ?? 0) || 0), 0)
        );
      }

      setLastUpdatedAt(new Date().toISOString());
    } catch (e: any) {
      const parts = [e?.message, e?.details, e?.hint, e?.code ? `code=${e.code}` : null].filter(Boolean);
      setError(parts.length ? parts.join("\n") : "Failed to load dashboard reports");
    } finally {
      setDataLoading(false);
      refreshInFlightRef.current = false;
    }
  }, [user?.id, isFullAdmin]);

  const syncPendingPaystack = useCallback(async () => {
    if (!user) return;
    setSyncing(true);
    setSyncResult(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        setSyncResult({ error: "Not logged in" });
        return;
      }
      const res = await fetch("/api/paystack/sync-pending", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = (await res.json()) as { updated?: number; error?: string };
      if (!res.ok) {
        setSyncResult({ error: json?.error ?? `HTTP ${res.status}` });
        return;
      }
      setSyncResult({ updated: json.updated ?? 0 });
      if ((json.updated ?? 0) > 0) await refreshData();
    } catch (e: any) {
      setSyncResult({ error: e?.message ?? "Sync failed" });
    } finally {
      setSyncing(false);
    }
  }, [user, refreshData]);

  useEffect(() => {
    if (authLoading || portalLoading) return;
    if (!isAuthenticated || !user || !isPortalMember) {
      router.replace("/fusion-xpress");
      return;
    }

    let cancelled = false;

    const init = async () => {
      setLoading(true);
      setError(null);
      try {
        // If portal_members isn't installed yet, block access until configured.
        // (Prevents non-portal users from entering /dashboard.)
        if (cancelled) return;
        await refreshData();
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Unable to load dashboard");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    init();
    return () => {
      cancelled = true;
    };
  }, [authLoading, isAuthenticated, isPortalMember, portalLoading, refreshData, router, user]);

  useEffect(() => {
    if (!isPortalMember || !user?.id) return;

    const channel = supabase
      .channel(`fusion-xpress-dashboard-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "transactions" }, () => refreshData())
      .on("postgres_changes", { event: "*", schema: "public", table: "votes" }, () => refreshData())
      .on("postgres_changes", { event: "*", schema: "public", table: "ticket_issues" }, () => refreshData())
      .on("postgres_changes", { event: "*", schema: "public", table: "campaigns" }, () => refreshData())
      .subscribe();

    const interval = window.setInterval(() => refreshData(), 15_000);

    return () => {
      window.clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [isPortalMember, refreshData, user?.id]);

  if (authLoading || portalLoading || loading) {
    return (
      <div className="min-h-[60vh] bg-transparent flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard…</p>
        </div>
      </div>
    );
  }

  // Avoid flashing private UI while redirecting.
  if (!isAuthenticated || !user || !isPortalMember) return null;

  const updatedLabel = lastUpdatedAt ? new Date(lastUpdatedAt).toLocaleString() : "—";

  return (
    <div className="text-left">
      <div className="flex items-start sm:items-center justify-between gap-4 flex-col sm:flex-row">
        <div className="min-w-0">
          <h2 className="text-xl md:text-2xl font-extrabold text-gray-900 text-left">Recent Activity</h2>
          <p className="mt-1 text-gray-600 max-w-3xl text-left">
            Create ticket or voting campaigns, generate shareable payment links, and track webhook-confirmed activity.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={refreshData}
            disabled={dataLoading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-gray-200 bg-white hover:bg-gray-50 text-gray-900 font-semibold disabled:opacity-60"
            title="Refresh reports"
          >
            <RefreshCw className={`w-4 h-4 ${dataLoading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      <div className="mt-3 text-sm text-gray-600 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="text-left">
          <span className="font-semibold">Last updated:</span> {updatedLabel}
        </div>
        <div className="text-left text-gray-500">Auto-updates when payments/votes/tickets change.</div>
      </div>

      {!isFullAdmin && (
        <div className="mt-6 rounded-md border border-secondary-200 bg-secondary-50 p-4 text-secondary-900">
          <div className="font-extrabold">Limited access</div>
          <div className="mt-1 text-sm">
            You can view and manage only campaigns created under your account. Admin-only tools (like user management) are hidden.
          </div>
        </div>
      )}

      {isManager && (
        <div className="mt-6 rounded-md border border-secondary-200 bg-secondary-50 p-4 text-secondary-900">
          <div className="font-extrabold">Manager access</div>
          <div className="mt-1 text-sm">
            You can add clients and manage campaigns. Only full admins can add other admins or managers.
          </div>
        </div>
      )}

      {error && (
        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-md text-red-700 whitespace-pre-wrap">
          {error}
        </div>
      )}

      {!hasFeature("reports") && (
        <div className="mt-6 rounded-md border border-secondary-200 bg-secondary-50 p-6 text-secondary-900">
          <div className="font-extrabold">Dashboard</div>
          <div className="mt-2 text-sm">
            Summary reports are not enabled for your account. Visit{" "}
            <Link href="/dashboard/campaigns" className="text-primary-700 font-semibold hover:underline">
              campaigns
            </Link>{" "}
            to manage your campaigns.
          </div>
        </div>
      )}

      {hasFeature("reports") && (
      <>
      {/* KPI cards (styled like screenshot tiles) */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        <div className="bg-white rounded-md shadow-sm p-6 border border-gray-200 border-t-4 border-primary-600">
          <div className="flex items-center justify-end">
            <Link
              href="/dashboard/campaigns"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-gray-200 bg-white hover:bg-gray-50 text-gray-800 text-xs font-semibold"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              View More
            </Link>
          </div>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="mt-4 text-sm font-extrabold text-primary-700 text-left">Revenue</div>
                <div className="mt-2 text-2xl font-extrabold text-gray-900 text-left">{formatRevenue}</div>
                <div className="mt-2 text-sm text-gray-600 text-left">Webhook-confirmed payments only.</div>
              </div>
              <span className="inline-flex w-10 h-10 rounded-xl bg-primary-50 items-center justify-center">
                <Wallet className="w-5 h-5 text-primary-700" />
              </span>
            </div>
        </div>

        <div className="bg-white rounded-md shadow-sm p-6 border border-gray-200 border-t-4 border-primary-600">
          <div className="flex items-center justify-end">
            <Link
              href="/dashboard/campaigns"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-gray-200 bg-white hover:bg-gray-50 text-gray-800 text-xs font-semibold"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              View More
            </Link>
          </div>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="mt-4 text-sm font-extrabold text-primary-700 text-left">Successful payments</div>
                <div className="mt-2 text-2xl font-extrabold text-gray-900 text-left">{successfulPayments.toLocaleString()}</div>
                <div className="mt-2 text-sm text-gray-600 text-left">Count of successful transactions.</div>
              </div>
              <span className="inline-flex w-10 h-10 rounded-xl bg-secondary-50 items-center justify-center">
                <Shield className="w-5 h-5 text-secondary-700" />
              </span>
            </div>
        </div>

        <div className="bg-white rounded-md shadow-sm p-6 border border-gray-200 border-t-4 border-primary-600">
          <div className="flex items-center justify-end">
            <Link
              href="/dashboard/campaigns"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-gray-200 bg-white hover:bg-gray-50 text-gray-800 text-xs font-semibold"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              View More
            </Link>
          </div>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="mt-4 text-sm font-extrabold text-primary-700 text-left">Tickets issued</div>
                <div className="mt-2 text-2xl font-extrabold text-gray-900 text-left">{totalTicketsIssued.toLocaleString()}</div>
                <div className="mt-2 text-sm text-gray-600 text-left">Issued after webhook verification.</div>
              </div>
              <span className="inline-flex w-10 h-10 rounded-xl bg-gray-50 items-center justify-center">
                <Ticket className="w-5 h-5 text-gray-900" />
              </span>
            </div>
        </div>

        <div className="bg-white rounded-md shadow-sm p-6 border border-gray-200 border-t-4 border-primary-600">
          <div className="flex items-center justify-end">
            <Link
              href="/dashboard/campaigns"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-gray-200 bg-white hover:bg-gray-50 text-gray-800 text-xs font-semibold"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              View More
            </Link>
          </div>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="mt-4 text-sm font-extrabold text-primary-700 text-left">Votes counted</div>
                <div className="mt-2 text-2xl font-extrabold text-gray-900 text-left">{totalVotes.toLocaleString()}</div>
                <div className="mt-2 text-sm text-gray-600 text-left">Counted from votes table.</div>
              </div>
              <span className="inline-flex w-10 h-10 rounded-xl bg-primary-50 items-center justify-center">
                <Vote className="w-5 h-5 text-primary-700" />
              </span>
            </div>
        </div>
      </div>

      {/* Summary tiles */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-md shadow-sm p-6 border border-gray-200">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm font-extrabold text-primary-700 text-left">Total campaigns</div>
              <div className="mt-2 text-2xl font-extrabold text-gray-900 text-left">{campaignsCount.toLocaleString()}</div>
              <div className="mt-2 text-sm text-gray-600 text-left">
                Active: <span className="font-semibold text-secondary-700">{activeCampaignsCount}</span> · Inactive:{" "}
                <span className="font-semibold text-gray-600">{inactiveCampaignsCount}</span>
              </div>
            </div>
            <span className="inline-flex w-10 h-10 rounded-xl bg-gray-50 items-center justify-center">
              <ExternalLink className="w-5 h-5 text-gray-500" />
            </span>
          </div>
        </div>

        <div className="bg-white rounded-md shadow-sm p-6 border border-gray-200">
          <div className="text-sm font-extrabold text-primary-700 text-left">Public link format</div>
          <div className="mt-2 text-xl font-extrabold text-gray-900 text-left">/&lt;slug&gt;</div>
          <div className="mt-3 text-gray-600 text-sm text-left">
            Campaign links are public, but payment success is confirmed only by webhook.
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/dashboard/campaigns"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary-700 text-white font-semibold hover:bg-primary-800"
            >
              Manage campaigns
              <ExternalLink className="w-4 h-4" />
            </Link>
            <Link
              href="/dashboard/campaigns/new"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-gray-200 bg-white hover:bg-gray-50 text-gray-900 font-semibold"
            >
              Create new
              <Plus className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* Money report: recent transactions */}
      <div className="mt-8 bg-white rounded-md shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="text-sm font-extrabold text-primary-700 text-left">Recent Payments</div>
            <p className="mt-2 text-gray-600 text-sm text-left">
              Latest transactions with payer name/email. Status is webhook-confirmed only when marked{" "}
              <span className="font-semibold">success</span>. Stuck on pending? Click Sync to verify with Paystack.
            </p>
            {syncResult && (
              <p className={`mt-2 text-sm font-medium ${syncResult.error ? "text-red-600" : "text-green-700"}`}>
                {syncResult.error ?? `Synced ${syncResult.updated} transaction(s).`}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={syncPendingPaystack}
              disabled={syncing}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-primary-200 bg-primary-50 text-primary-800 font-semibold hover:bg-primary-100 disabled:opacity-60"
            >
              <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
              {syncing ? "Syncing..." : "Sync pending"}
            </button>
            <Link
              href="/dashboard/campaigns"
              className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-md border border-gray-200 hover:bg-gray-50 text-gray-900 font-semibold"
            >
              View More
              <ExternalLink className="w-4 h-4" />
            </Link>
          </div>
        </div>

        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr className="text-left">
                <th className="px-6 py-3 font-bold text-gray-600">Time</th>
                <th className="px-6 py-3 font-bold text-gray-600">Payer</th>
                <th className="px-6 py-3 font-bold text-gray-600">Campaign</th>
                <th className="px-6 py-3 font-bold text-gray-600">Type</th>
                <th className="px-6 py-3 font-bold text-gray-600">Reference</th>
                <th className="px-6 py-3 font-bold text-gray-600">Amount</th>
                <th className="px-6 py-3 font-bold text-gray-600">Provider</th>
                <th className="px-6 py-3 font-bold text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody>
              {recentTransactions.length === 0 ? (
                <tr>
                  <td className="px-6 py-6 text-gray-600" colSpan={8}>
                    No transactions yet.
                  </td>
                </tr>
              ) : (
                recentTransactions.map((t) => {
                  const c = campaignTitleById[t.campaign_id];
                  const status = String(t.status ?? "");
                  const statusClass =
                    status === "success"
                      ? "text-secondary-800 bg-secondary-50 border-secondary-100"
                      : status === "failed"
                        ? "text-red-700 bg-red-50 border-red-100"
                        : "text-gray-700 bg-gray-50 border-gray-100";

                  const payerDisplay = (t as any).payer_name?.trim()
                    ? String((t as any).payer_name).trim()
                    : (t as any).email?.trim()
                      ? String((t as any).email)
                      : "—";

                  return (
                    <tr key={t.id} className="border-b border-gray-100">
                      <td className="px-6 py-4 text-gray-700 whitespace-nowrap">
                        {new Date(t.created_at).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-gray-900 font-medium whitespace-nowrap" title={(t as any).email ?? undefined}>
                        {payerDisplay}
                      </td>
                      <td className="px-6 py-4 text-gray-900 font-semibold whitespace-nowrap">
                        {c?.title ?? "—"}
                      </td>
                      <td className="px-6 py-4 text-gray-700 whitespace-nowrap">
                        {c?.type ? (c.type === "vote" ? "Voting" : "Tickets") : "—"}
                      </td>
                      <td className="px-6 py-4 text-gray-700 font-mono whitespace-nowrap">{t.reference}</td>
                        <td className="px-6 py-4 text-gray-900 whitespace-nowrap">
                        {String(t.currency ?? "").toUpperCase()} {Number(t.amount ?? 0).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-gray-600 whitespace-nowrap">
                        {(t as any).provider ?? "—"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full border text-xs font-bold ${statusClass}`}>
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
      </div>
      </>
      )}
    </div>
  );
}

