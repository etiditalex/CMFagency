"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Copy,
  ExternalLink,
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

type Campaign = {
  id: string;
  type: "ticket" | "vote";
  slug: string;
  title: string;
  description: string | null;
  currency: string;
  unit_amount: number;
  max_per_txn: number;
  is_active: boolean;
  created_at: string;
};

type TxRow = {
  id: string;
  reference: string;
  status: string;
  amount: number;
  currency: string;
  quantity: number;
  created_at: string;
};

type VoteRow = {
  contestant_id: string;
  votes: number;
  created_at: string;
};

type ContestantRow = {
  id: string;
  name: string;
  sort_order: number;
};

type TicketIssueRow = {
  quantity: number;
  issued_at: string;
};

type RangePreset = "all" | "today" | "7d" | "30d" | "custom";

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export default function CampaignReportPage() {
  const router = useRouter();
  const params = useParams<{ id?: string | string[] }>();
  const campaignId = useMemo(() => {
    const p = params?.id;
    if (Array.isArray(p)) return p[0] ?? "";
    return String(p ?? "");
  }, [params?.id]);

  const { isAuthenticated, user, loading: authLoading } = useAuth();
  const { isPortalMember, loading: portalLoading } = usePortal();

  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [campaign, setCampaign] = useState<Campaign | null>(null);

  const [successfulPayments, setSuccessfulPayments] = useState(0);
  const [revenueByCurrency, setRevenueByCurrency] = useState<Record<string, number>>({});
  const [totalTicketsIssued, setTotalTicketsIssued] = useState(0);
  const [totalVotes, setTotalVotes] = useState(0);
  const [recentTransactions, setRecentTransactions] = useState<TxRow[]>([]);
  const [contestants, setContestants] = useState<ContestantRow[]>([]);
  const [votesByContestant, setVotesByContestant] = useState<Record<string, number>>({});
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);

  const [range, setRange] = useState<RangePreset>("30d");
  const [customFrom, setCustomFrom] = useState<string>("");
  const [customTo, setCustomTo] = useState<string>("");

  const refreshInFlightRef = useRef(false);

  const publicUrl = useMemo(() => {
    if (!campaign?.slug) return "";
    return `/pay/${campaign.slug}`;
  }, [campaign?.slug]);

  const formatRevenue = useMemo(() => {
    const entries = Object.entries(revenueByCurrency).filter(([, v]) => Number.isFinite(v) && v > 0);
    if (entries.length === 0) return "—";
    if (entries.length === 1) {
      const [cur, amt] = entries[0];
      return `${cur} ${Number(amt).toLocaleString()}`;
    }
    return entries
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([cur, amt]) => `${cur} ${Number(amt).toLocaleString()}`)
      .join(" · ");
  }, [revenueByCurrency]);

  const copyPublicLink = async () => {
    if (typeof window === "undefined") return;
    if (!publicUrl) return;
    const url = `${window.location.origin}${publicUrl}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // noop
    }
  };

  const rangeBounds = useMemo(() => {
    const now = new Date();

    if (range === "all") return { start: null as string | null, end: null as string | null };

    if (range === "today") {
      return { start: startOfDay(now).toISOString(), end: now.toISOString() };
    }

    if (range === "7d") {
      const start = new Date(now);
      start.setDate(start.getDate() - 7);
      return { start: start.toISOString(), end: now.toISOString() };
    }

    if (range === "30d") {
      const start = new Date(now);
      start.setDate(start.getDate() - 30);
      return { start: start.toISOString(), end: now.toISOString() };
    }

    // custom
    if (!customFrom || !customTo) return { start: null as string | null, end: null as string | null };
    const from = startOfDay(new Date(`${customFrom}T00:00:00`));
    const to = endOfDay(new Date(`${customTo}T00:00:00`));
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return { start: null, end: null };
    return { start: from.toISOString(), end: to.toISOString() };
  }, [customFrom, customTo, range]);

  const rangeLabel = useMemo(() => {
    if (range === "all") return "All time";
    if (range === "today") return "Today";
    if (range === "7d") return "Last 7 days";
    if (range === "30d") return "Last 30 days";
    if (range === "custom") {
      if (!customFrom || !customTo) return "Custom range";
      return `${customFrom} → ${customTo}`;
    }
    return "—";
  }, [customFrom, customTo, range]);

  const refreshData = async () => {
    if (!campaignId) return;
    if (refreshInFlightRef.current) return;
    refreshInFlightRef.current = true;
    setDataLoading(true);
    setError(null);

    try {
      // Campaign
      const { data: c, error: cErr } = await supabase
        .from("campaigns")
        .select("id,type,slug,title,description,currency,unit_amount,max_per_txn,is_active,created_at")
        .eq("id", campaignId)
        .single();
      if (cErr) throw cErr;
      setCampaign(c as Campaign);

      // Recent transactions (non-PII)
      let txQuery = supabase
        .from("transactions")
        .select("id,reference,status,amount,currency,quantity,created_at")
        .eq("campaign_id", campaignId);
      if (rangeBounds.start) txQuery = txQuery.gte("created_at", rangeBounds.start);
      if (rangeBounds.end) txQuery = txQuery.lte("created_at", rangeBounds.end);
      const { data: txRows, error: txErr } = await txQuery.order("created_at", { ascending: false }).limit(50);
      if (txErr) throw txErr;
      setRecentTransactions((txRows ?? []) as TxRow[]);

      // Revenue + successful payments (from successful transactions only)
      const success = (txRows ?? []).filter((t: any) => t.status === "success");
      setSuccessfulPayments(success.length);
      const rev: Record<string, number> = {};
      for (const t of success as any[]) {
        const cur = String(t.currency ?? "").toUpperCase() || "—";
        const amt = Number(t.amount ?? 0);
        if (!Number.isFinite(amt)) continue;
        rev[cur] = (rev[cur] ?? 0) + amt;
      }
      setRevenueByCurrency(rev);

      // Tickets issued (idempotent ticket_issues table)
      let tiQuery = supabase.from("ticket_issues").select("quantity,issued_at").eq("campaign_id", campaignId);
      if (rangeBounds.start) tiQuery = tiQuery.gte("issued_at", rangeBounds.start);
      if (rangeBounds.end) tiQuery = tiQuery.lte("issued_at", rangeBounds.end);
      const { data: tiRows, error: tiErr } = await tiQuery;
      if (tiErr) throw tiErr;
      setTotalTicketsIssued(
        (tiRows ?? []).reduce((acc: number, r: TicketIssueRow) => acc + (Number(r.quantity ?? 0) || 0), 0)
      );

      // Votes counted (idempotent votes table)
      let vQuery = supabase.from("votes").select("contestant_id,votes,created_at").eq("campaign_id", campaignId);
      if (rangeBounds.start) vQuery = vQuery.gte("created_at", rangeBounds.start);
      if (rangeBounds.end) vQuery = vQuery.lte("created_at", rangeBounds.end);
      const { data: vRows, error: vErr } = await vQuery;
      if (vErr) throw vErr;
      const total = (vRows ?? []).reduce((acc: number, r: VoteRow) => acc + (Number(r.votes ?? 0) || 0), 0);
      setTotalVotes(total);

      const byContestant: Record<string, number> = {};
      for (const r of (vRows ?? []) as VoteRow[]) {
        const id = String(r.contestant_id ?? "");
        const v = Number(r.votes ?? 0) || 0;
        if (!id) continue;
        byContestant[id] = (byContestant[id] ?? 0) + v;
      }
      setVotesByContestant(byContestant);

      // Contestants (for vote breakdown)
      const { data: contestantsRows, error: conErr } = await supabase
        .from("contestants")
        .select("id,name,sort_order")
        .eq("campaign_id", campaignId)
        .order("sort_order", { ascending: true });
      if (conErr) {
        // If not a vote campaign, or no contestants, just ignore silently.
        setContestants([]);
      } else {
        setContestants((contestantsRows ?? []) as ContestantRow[]);
      }

      setLastUpdatedAt(new Date().toISOString());
    } catch (e: any) {
      const parts = [e?.message, e?.details, e?.hint, e?.code ? `code=${e.code}` : null].filter(Boolean);
      setError(parts.length ? parts.join("\n") : "Failed to load campaign report");
    } finally {
      setDataLoading(false);
      refreshInFlightRef.current = false;
    }
  };

  useEffect(() => {
    if (authLoading || portalLoading) return;
    if (!isAuthenticated || !user || !isPortalMember) {
      router.replace("/fusion-xpress");
      return;
    }
    if (!campaignId) {
      setError("Missing campaign id in URL.");
      setLoading(false);
      return;
    }

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        if (!cancelled) await refreshData();
      } catch (e: any) {
        if (isMissingPortalMembersTable(e)) {
          await supabase.auth.signOut();
          router.replace("/fusion-xpress?error=setup");
          return;
        }
        if (!cancelled) setError(e?.message ?? "Failed to load campaign report");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, portalLoading, isPortalMember, campaignId, isAuthenticated, router, user?.id]);

  useEffect(() => {
    if (!campaignId) return;

    const channel = supabase
      .channel(`fusion-xpress-campaign-${campaignId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "transactions", filter: `campaign_id=eq.${campaignId}` },
        () => refreshData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "votes", filter: `campaign_id=eq.${campaignId}` },
        () => refreshData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ticket_issues", filter: `campaign_id=eq.${campaignId}` },
        () => refreshData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "contestants", filter: `campaign_id=eq.${campaignId}` },
        () => refreshData()
      )
      .subscribe();

    const interval = window.setInterval(() => refreshData(), 15_000);

    return () => {
      window.clearInterval(interval);
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId]);

  useEffect(() => {
    // Refresh when range changes.
    if (!campaignId) return;
    refreshData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range, customFrom, customTo, campaignId]);

  if (authLoading || loading) {
    return (
      <div className="min-h-[60vh] bg-transparent flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading report…</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) return null;

  const updatedLabel = lastUpdatedAt ? new Date(lastUpdatedAt).toLocaleString() : "—";
  const isVote = campaign?.type === "vote";
  const TypeIcon = isVote ? Vote : Ticket;

  return (
    <div className="text-left">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-start justify-between gap-4 flex-col lg:flex-row">
          <div className="min-w-0">
            <Link href="/dashboard/campaigns" className="inline-flex items-center text-primary-700 hover:text-primary-800 font-semibold">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to campaigns
            </Link>

            <div className="mt-4 flex items-center gap-3 flex-wrap">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary-700 text-white px-4 py-2 font-bold">
                <Shield className="w-4 h-4" />
                Campaign Report
              </div>
              {campaign && (
                <div className="inline-flex items-center gap-2 rounded-full bg-white border border-gray-200 px-4 py-2 text-gray-900 font-bold">
                  <TypeIcon className="w-4 h-4" />
                  {campaign.type === "vote" ? "Voting" : "Tickets"}
                </div>
              )}
              {campaign?.is_active != null && (
                <div
                  className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 font-bold ${
                    campaign.is_active ? "bg-green-50 border-green-200 text-green-800" : "bg-gray-50 border-gray-200 text-gray-700"
                  }`}
                >
                  {campaign.is_active ? "Active" : "Inactive"}
                </div>
              )}
            </div>

            <h2 className="mt-4 text-2xl md:text-3xl font-extrabold text-gray-900 truncate text-left">
              {campaign?.title ?? "Campaign"}
            </h2>
            <div className="mt-2 text-gray-600 text-left">
              Slug: <span className="font-mono text-gray-900">{campaign?.slug ?? "—"}</span>
              <span className="mx-2">·</span>
              Last updated: <span className="font-semibold">{updatedLabel}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={refreshData}
              disabled={dataLoading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-900 font-semibold disabled:opacity-60"
            >
              <RefreshCw className={`w-4 h-4 ${dataLoading ? "animate-spin" : ""}`} />
              Refresh
            </button>

            <button
              type="button"
              onClick={copyPublicLink}
              disabled={!publicUrl}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-900 font-semibold disabled:opacity-60"
            >
              <Copy className="w-4 h-4" />
              Copy public link
            </button>

            <Link
              href={publicUrl || "/dashboard/campaigns"}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-700 text-white font-semibold hover:bg-primary-800 disabled:opacity-60"
            >
              <ExternalLink className="w-4 h-4" />
              Open public page
            </Link>
          </div>
        </div>

        {/* Date range controls */}
        <div className="mt-6 bg-white rounded-md shadow-sm border border-gray-200 p-4">
          <div className="flex items-start sm:items-center justify-between gap-3 flex-col sm:flex-row">
            <div className="text-sm text-gray-600 text-left">
              <span className="font-semibold">Range:</span> {rangeLabel}
              <span className="mx-2">·</span>
              <span className="font-semibold">Last updated:</span> {updatedLabel}
            </div>

            <div className="flex flex-wrap gap-2">
              {(
                [
                  { id: "today", label: "Today" },
                  { id: "7d", label: "7 days" },
                  { id: "30d", label: "30 days" },
                  { id: "all", label: "All time" },
                  { id: "custom", label: "Custom" },
                ] as Array<{ id: RangePreset; label: string }>
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setRange(opt.id)}
                  className={`px-3 py-2 rounded-lg border text-sm font-semibold ${
                    range === opt.id
                      ? "border-primary-600 bg-primary-50 text-primary-700"
                      : "border-gray-200 bg-white hover:bg-gray-50 text-gray-900"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {range === "custom" && (
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold tracking-widest text-gray-500 uppercase mb-1">From</label>
                <input
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold tracking-widest text-gray-500 uppercase mb-1">To</label>
                <input
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => refreshData()}
                  disabled={dataLoading}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary-700 text-white font-semibold hover:bg-primary-800 disabled:opacity-60"
                >
                  <RefreshCw className={`w-4 h-4 ${dataLoading ? "animate-spin" : ""}`} />
                  Apply
                </button>
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-md text-red-700 whitespace-pre-wrap">
            {error}
          </div>
        )}

        {/* KPIs */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs font-bold tracking-widest text-gray-500 uppercase">Revenue</div>
                <div className="mt-2 text-2xl font-extrabold text-gray-900">{formatRevenue}</div>
                <div className="mt-2 text-sm text-gray-600">Successful payments only.</div>
              </div>
              <span className="inline-flex w-10 h-10 rounded-xl bg-primary-50 items-center justify-center">
                <Wallet className="w-5 h-5 text-primary-700" />
              </span>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs font-bold tracking-widest text-gray-500 uppercase">Successful payments</div>
                <div className="mt-2 text-2xl font-extrabold text-gray-900">{successfulPayments.toLocaleString()}</div>
                <div className="mt-2 text-sm text-gray-600">Webhook-confirmed.</div>
              </div>
              <span className="inline-flex w-10 h-10 rounded-xl bg-secondary-50 items-center justify-center">
                <Shield className="w-5 h-5 text-secondary-800" />
              </span>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs font-bold tracking-widest text-gray-500 uppercase">Tickets issued</div>
                <div className="mt-2 text-2xl font-extrabold text-gray-900">{totalTicketsIssued.toLocaleString()}</div>
                <div className="mt-2 text-sm text-gray-600">From ticket_issues.</div>
              </div>
              <span className="inline-flex w-10 h-10 rounded-xl bg-gray-50 items-center justify-center">
                <Ticket className="w-5 h-5 text-gray-900" />
              </span>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs font-bold tracking-widest text-gray-500 uppercase">Votes counted</div>
                <div className="mt-2 text-2xl font-extrabold text-gray-900">{totalVotes.toLocaleString()}</div>
                <div className="mt-2 text-sm text-gray-600">From votes table.</div>
              </div>
              <span className="inline-flex w-10 h-10 rounded-xl bg-primary-50 items-center justify-center">
                <Vote className="w-5 h-5 text-primary-700" />
              </span>
            </div>
          </div>
        </div>

        {/* Vote breakdown */}
        {isVote && (
          <div className="mt-10 bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <div className="text-xs font-bold tracking-widest text-gray-500 uppercase">Voting</div>
              <h2 className="mt-1 text-xl font-extrabold text-gray-900">Votes by contestant</h2>
              <p className="mt-2 text-gray-600 text-sm">Totals are computed from webhook-confirmed vote rows.</p>
            </div>

            <div className="overflow-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr className="text-left">
                    <th className="px-6 py-3 font-bold text-gray-600">Contestant</th>
                    <th className="px-6 py-3 font-bold text-gray-600">Votes</th>
                  </tr>
                </thead>
                <tbody>
                  {contestants.length === 0 ? (
                    <tr>
                      <td className="px-6 py-6 text-gray-600" colSpan={2}>
                        No contestants found for this campaign.
                      </td>
                    </tr>
                  ) : (
                    contestants.map((c) => (
                      <tr key={c.id} className="border-b border-gray-100">
                        <td className="px-6 py-4 text-gray-900 font-semibold">{c.name}</td>
                        <td className="px-6 py-4 text-gray-900 font-extrabold">
                          {(votesByContestant[c.id] ?? 0).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Transactions */}
        <div className="mt-10 bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <div className="text-xs font-bold tracking-widest text-gray-500 uppercase">Payments</div>
            <h2 className="mt-1 text-xl font-extrabold text-gray-900">Transactions</h2>
            <p className="mt-2 text-gray-600 text-sm">
              Latest transactions in the selected range (non-PII). Use{" "}
              <span className="font-semibold">success</span> for revenue and issuance.
            </p>
          </div>

          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr className="text-left">
                  <th className="px-6 py-3 font-bold text-gray-600">Time</th>
                  <th className="px-6 py-3 font-bold text-gray-600">Reference</th>
                  <th className="px-6 py-3 font-bold text-gray-600">Qty</th>
                  <th className="px-6 py-3 font-bold text-gray-600">Amount</th>
                  <th className="px-6 py-3 font-bold text-gray-600">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentTransactions.length === 0 ? (
                  <tr>
                    <td className="px-6 py-6 text-gray-600" colSpan={5}>
                      No transactions yet.
                    </td>
                  </tr>
                ) : (
                  recentTransactions.map((t) => {
                    const status = String(t.status ?? "");
                    const statusClass =
                      status === "success"
                        ? "text-green-700 bg-green-50 border-green-100"
                        : status === "failed"
                          ? "text-red-700 bg-red-50 border-red-100"
                          : "text-gray-700 bg-gray-50 border-gray-100";

                    return (
                      <tr key={t.id} className="border-b border-gray-100">
                        <td className="px-6 py-4 text-gray-700 whitespace-nowrap">
                          {new Date(t.created_at).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-gray-700 font-mono whitespace-nowrap">{t.reference}</td>
                        <td className="px-6 py-4 text-gray-900 font-semibold whitespace-nowrap">
                          {Number(t.quantity ?? 0).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-gray-900 whitespace-nowrap">
                          {String(t.currency ?? "").toUpperCase()} {Number(t.amount ?? 0).toLocaleString()}
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
      </div>
    </div>
  );
}

