"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Briefcase,
  Calendar,
  Copy,
  Crown,
  ExternalLink,
  Plus,
  RefreshCw,
  Shield,
  ShoppingBag,
  Ticket,
  Vote,
  Wallet,
} from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { usePortal } from "@/contexts/PortalContext";
import { supabase } from "@/lib/supabase";
import { fetchAllSupabasePages } from "@/lib/supabase-fetch-all-pages";

function isMissingPortalMembersTable(err: any) {
  const msg = String(err?.message ?? "");
  const code = String(err?.code ?? "");
  return code === "42P01" || (msg.includes("portal_members") && msg.includes("does not exist"));
}

function isoToNairobiDateInput(iso: string): string {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Africa/Nairobi",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date(iso));
    const y = parts.find((p) => p.type === "year")?.value;
    const m = parts.find((p) => p.type === "month")?.value;
    const d = parts.find((p) => p.type === "day")?.value;
    if (!y || !m || !d) return "";
    return `${y}-${m}-${d}`;
  } catch {
    return "";
  }
}

function formatVotingOpensInNairobi(iso: string): string {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: "Africa/Nairobi",
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export default function DashboardHomePage() {
  const router = useRouter();
  const { isAuthenticated, user, loading: authLoading } = useAuth();
  const { isPortalMember, loading: portalLoading, isFullAdmin, isManager, isAdmin, hasFeature, isEmployer } =
    usePortal();

  /** Until Fusion Xpress session (/login-status) is verified — keep brief shell spinner only for this gate, not for stats fetch. */
  const [sessionChecking, setSessionChecking] = useState(true);
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
  const [revenueByCurrencyTickets, setRevenueByCurrencyTickets] = useState<Record<string, number>>({});
  const [revenueByCurrencyVotes, setRevenueByCurrencyVotes] = useState<Record<string, number>>({});
  const [revenueByCurrencyMerchandise, setRevenueByCurrencyMerchandise] = useState<Record<string, number>>({});
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
  const [pendingJobApplications, setPendingJobApplications] = useState(0);
  const [kcmMembershipPaidKes, setKcmMembershipPaidKes] = useState(0);
  const [kcmMembershipPaidCount, setKcmMembershipPaidCount] = useState(0);
  const [kcmContributionsKes, setKcmContributionsKes] = useState(0);

  const [votingScheduleDate, setVotingScheduleDate] = useState("2026-04-01");
  const [votingScheduleDisplay, setVotingScheduleDisplay] = useState("");
  const [votingScheduleLoading, setVotingScheduleLoading] = useState(false);
  const [votingScheduleSaving, setVotingScheduleSaving] = useState(false);
  const [votingScheduleMessage, setVotingScheduleMessage] = useState<string | null>(null);
  const [allVotingCopied, setAllVotingCopied] = useState(false);
  const [allVotingPublicUrl, setAllVotingPublicUrl] = useState("");

  const refreshInFlightRef = useRef(false);

  useEffect(() => {
    const base = (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "");
    setAllVotingPublicUrl(base ? `${base}/voting/all` : `${window.location.origin}/voting/all`);
  }, []);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ updated?: number; error?: string } | null>(null);
  const realtimeRefreshTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isAdmin) {
      setPendingJobApplications(0);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (!token || cancelled) return;
        const res = await fetch("/api/fusion-xpress/applications?status=pending&limit=1", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const j = await res.json().catch(() => ({}));
        if (!cancelled && res.ok && typeof j.total === "number") setPendingJobApplications(j.total);
        else if (!cancelled) setPendingJobApplications(0);
      } catch {
        if (!cancelled) setPendingJobApplications(0);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAdmin, lastUpdatedAt]);

  useEffect(() => {
    if (authLoading || portalLoading || isEmployer) return;
    if (!hasFeature("voting")) return;
    if (!isFullAdmin && !isManager) return;

    let cancelled = false;
    (async () => {
      setVotingScheduleLoading(true);
      setVotingScheduleMessage(null);
      try {
        const res = await fetch("/api/voting-schedule");
        const j = (await res.json()) as { voting_starts_at?: string | null };
        if (cancelled) return;
        const iso = j?.voting_starts_at;
        const fallback = "2026-04-01T00:00:00+03:00";
        const effective = iso || fallback;
        const ymd = isoToNairobiDateInput(effective);
        setVotingScheduleDate(ymd || "2026-04-01");
        setVotingScheduleDisplay(formatVotingOpensInNairobi(effective));
      } catch {
        if (!cancelled) {
          setVotingScheduleDate("2026-04-01");
          setVotingScheduleDisplay(formatVotingOpensInNairobi("2026-04-01T00:00:00+03:00"));
        }
      } finally {
        if (!cancelled) setVotingScheduleLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authLoading, portalLoading, isEmployer, isFullAdmin, isManager, hasFeature]);

  const formatRevenueMap = (rev: Record<string, number>) => {
    const entries = Object.entries(rev).filter(([, v]) => Number.isFinite(v) && v > 0);
    if (entries.length === 0) return "—";
    if (entries.length === 1) {
      const [cur, amt] = entries[0];
      return `${cur} ${Number(amt).toLocaleString()}`;
    }
    return entries
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([cur, amt]) => `${cur} ${Number(amt).toLocaleString()}`)
      .join(" · ");
  };

  const formatRevenue = useMemo(() => formatRevenueMap(revenueByCurrency), [revenueByCurrency]);
  const formatRevenueTickets = useMemo(() => formatRevenueMap(revenueByCurrencyTickets), [revenueByCurrencyTickets]);
  const formatRevenueVotes = useMemo(() => formatRevenueMap(revenueByCurrencyVotes), [revenueByCurrencyVotes]);
  const formatRevenueMerchandise = useMemo(() => formatRevenueMap(revenueByCurrencyMerchandise), [revenueByCurrencyMerchandise]);

  const refreshData = useCallback(async () => {
    if (!user?.id) return;
    if (isEmployer) {
      setDataLoading(false);
      refreshInFlightRef.current = false;
      return;
    }
    if (refreshInFlightRef.current) return;
    refreshInFlightRef.current = true;

    setDataLoading(true);
    setError(null);

    try {
      // Campaigns: total + active/inactive + title lookup for transactions list.
      // RLS already scopes visibility (own/admin/event-linked campaigns), so do not
      // hard-filter by created_by here or historical ticket reports can disappear.
      const campaignsQuery = supabase
        .from("campaigns")
        .select("id,title,type,slug,is_active,created_at")
        .order("created_at", { ascending: false });

      const { data: campaigns, error: cErr } = await campaignsQuery;

      if (cErr) throw cErr;

      const rows = campaigns ?? [];
      const campaignIds = (rows as any[]).map((c) => c.id);
      const merchandiseCampaignId = (rows as any[]).find((c) => String(c.slug ?? "").toLowerCase() === "merchandise")?.id ?? null;
      const campaignRowsExcludingMerchandise = (rows as any[]).filter((c) => String(c.slug ?? "").toLowerCase() !== "merchandise");
      setCampaignsCount(campaignRowsExcludingMerchandise.length);
      setActiveCampaignsCount(campaignRowsExcludingMerchandise.filter((c) => c.is_active).length);
      setInactiveCampaignsCount(campaignRowsExcludingMerchandise.filter((c) => !c.is_active).length);

      const titleMap: Record<string, { title: string; type: string }> = {};
      for (const c of rows as any[]) {
        titleMap[String(c.id)] = { title: String(c.title ?? "Untitled campaign"), type: String(c.type ?? "") };
      }
      setCampaignTitleById(titleMap);

      // For clients, filter transactions/votes/tickets by their campaigns only.
      // When client has no campaigns, return empty (don't run unfiltered queries).
      const hasCampaigns = campaignIds.length > 0;
      const kcmSummaryPromise =
        isAdmin
          ? (async () => {
              const {
                data: { session },
              } = await supabase.auth.getSession();
              const token = session?.access_token;
              if (!token) return null;
              const res = await fetch("/api/fusion-xpress/kcm-memberships/summary", {
                headers: { Authorization: `Bearer ${token}` },
              });
              if (!res.ok) return null;
              return (await res.json().catch(() => ({}))) as {
                totalMembershipPaidKes?: number;
                membershipPaidCount?: number;
                totalContributionKes?: number;
              };
            })()
          : Promise.resolve(null);
      let resolvedKcmSummary: { totalMembershipPaidKes?: number; membershipPaidCount?: number; totalContributionKes?: number } | null =
        null;

      if (!hasCampaigns) {
        setRecentTransactions([]);
        setSuccessfulPayments(0);
        setRevenueByCurrency({});
        setRevenueByCurrencyTickets({});
        setRevenueByCurrencyVotes({});
        setRevenueByCurrencyMerchandise({});
        setTotalVotes(0);
        setTotalTicketsIssued(0);
      } else {
        const [txRes, successRows, kcmSummary] = await Promise.all([
          supabase
            .from("transactions")
            .select("id,reference,status,amount,currency,created_at,campaign_id,provider,email,payer_name")
            .order("created_at", { ascending: false })
            .limit(10),
          fetchAllSupabasePages(async (from, to) => {
            const r = await supabase
              .from("reportable_transactions")
              .select("amount,currency,resolved_type,campaign_id,quantity")
              .eq("status", "success")
              .in("campaign_id", campaignIds)
              .order("id", { ascending: true })
              .range(from, to);
            return { data: r.data as any[] | null, error: r.error };
          }),
          kcmSummaryPromise,
        ]);
        resolvedKcmSummary = kcmSummary;

        if (txRes.error) throw txRes.error;
        const rawTx = (txRes.data ?? []) as any[];
        const visibleTx = isAdmin
          ? rawTx
          : rawTx.filter((t) => t.status !== "failed" && t.status !== "abandoned");
        setRecentTransactions(visibleTx);
        const txCampaignIds = [...new Set(visibleTx.map((t) => String(t.campaign_id ?? "")).filter(Boolean))];
        if (txCampaignIds.length > 0) {
          const { data: txCampaigns } = await supabase.from("campaigns").select("id,title,type").in("id", txCampaignIds);
          if (txCampaigns?.length) {
            setCampaignTitleById((prev) => {
              const next = { ...prev };
              for (const c of txCampaigns as Array<{ id: string; title?: string; type?: string }>) {
                next[c.id] = {
                  title: String(c.title ?? next[c.id]?.title ?? c.id),
                  type: String(c.type ?? next[c.id]?.type ?? ""),
                };
              }
              return next;
            });
          }
        }

        setSuccessfulPayments(successRows.length);
        const rev: Record<string, number> = {};
        const revTickets: Record<string, number> = {};
        const revVotes: Record<string, number> = {};
        const revMerchandise: Record<string, number> = {};
        let voteUnits = 0;
        let ticketUnits = 0;
        for (const t of successRows as any[]) {
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
        setRevenueByCurrency(rev);
        setRevenueByCurrencyTickets(revTickets);
        setRevenueByCurrencyVotes(revVotes);
        setRevenueByCurrencyMerchandise(revMerchandise);
        setTotalVotes(voteUnits);
        setTotalTicketsIssued(ticketUnits);
      }

      if (isAdmin) {
        const kcmSummary = resolvedKcmSummary ?? (await kcmSummaryPromise);
        if (kcmSummary) {
          setKcmMembershipPaidKes(Number(kcmSummary.totalMembershipPaidKes ?? 0) || 0);
          setKcmMembershipPaidCount(Number(kcmSummary.membershipPaidCount ?? 0) || 0);
          setKcmContributionsKes(Number(kcmSummary.totalContributionKes ?? 0) || 0);
        } else {
          setKcmMembershipPaidKes(0);
          setKcmMembershipPaidCount(0);
          setKcmContributionsKes(0);
        }
      } else {
        setKcmMembershipPaidKes(0);
        setKcmMembershipPaidCount(0);
        setKcmContributionsKes(0);
      }

      setLastUpdatedAt(new Date().toISOString());
    } catch (e: any) {
      const parts = [e?.message, e?.details, e?.hint, e?.code ? `code=${e.code}` : null].filter(Boolean);
      setError(parts.length ? parts.join("\n") : "Failed to load dashboard reports");
    } finally {
      setDataLoading(false);
      refreshInFlightRef.current = false;
    }
  }, [user?.id, isFullAdmin, isEmployer, isAdmin]);

  const scheduleRefresh = useCallback(() => {
    if (realtimeRefreshTimeoutRef.current) return;
    realtimeRefreshTimeoutRef.current = window.setTimeout(() => {
      realtimeRefreshTimeoutRef.current = null;
      void refreshData();
    }, 800);
  }, [refreshData]);

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

  const saveVotingSchedule = useCallback(async () => {
    if (!votingScheduleDate || !/^\d{4}-\d{2}-\d{2}$/.test(votingScheduleDate)) {
      setVotingScheduleMessage("Use a valid date (YYYY-MM-DD).");
      return;
    }
    setVotingScheduleSaving(true);
    setVotingScheduleMessage(null);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        setVotingScheduleMessage("Not logged in.");
        return;
      }
      const res = await fetch("/api/fusion-xpress/voting-schedule", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ date: votingScheduleDate }),
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string; voting_starts_at?: string };
      if (!res.ok) {
        setVotingScheduleMessage(String(j?.error ?? `HTTP ${res.status}`));
        return;
      }
      const iso = j.voting_starts_at;
      if (iso) setVotingScheduleDisplay(formatVotingOpensInNairobi(iso));
      setVotingScheduleMessage("Saved. Public voting pages unlock at 00:00 East Africa Time on that date.");
    } catch (e: any) {
      setVotingScheduleMessage(e?.message ?? "Save failed");
    } finally {
      setVotingScheduleSaving(false);
    }
  }, [votingScheduleDate]);

  useEffect(() => {
    if (authLoading || portalLoading) return;
    if (!isAuthenticated || !user || !isPortalMember) {
      router.replace("/fusion-xpress");
      return;
    }

    let cancelled = false;

    const init = async () => {
      setSessionChecking(true);
      try {
        if (cancelled) return;
        setError(null);
        setSessionChecking(false);
        await refreshData();
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Unable to load dashboard");
        if (!cancelled) setSessionChecking(false);
      }
    };

    init();
    return () => {
      cancelled = true;
    };
  }, [authLoading, isAuthenticated, isPortalMember, portalLoading, refreshData, router, user]);

  useEffect(() => {
    if (!isPortalMember || !user?.id || isEmployer) return;

    const channel = supabase
      .channel(`fusion-xpress-dashboard-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "transactions" }, scheduleRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "votes" }, scheduleRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "ticket_issues" }, scheduleRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "contestants" }, scheduleRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "campaigns" }, scheduleRefresh)
      .subscribe();

    const interval = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      void refreshData();
    }, 60_000);

    return () => {
      window.clearInterval(interval);
      if (realtimeRefreshTimeoutRef.current) {
        window.clearTimeout(realtimeRefreshTimeoutRef.current);
        realtimeRefreshTimeoutRef.current = null;
      }
      supabase.removeChannel(channel);
    };
  }, [isPortalMember, refreshData, scheduleRefresh, user?.id, isEmployer]);

  if (authLoading || portalLoading || sessionChecking) {
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

  if (isEmployer) {
    return (
      <div className="text-left max-w-2xl">
        <h2 className="text-xl md:text-2xl font-extrabold text-gray-900">Employer hub</h2>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/dashboard/job-listings"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary-600 px-5 py-2.5 font-semibold text-white hover:bg-primary-700"
          >
            <Briefcase className="w-5 h-5" />
            Job listings
          </Link>
          <Link
            href="/jobs"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-5 py-2.5 font-semibold text-gray-800 hover:bg-gray-50"
          >
            View public board
            <ExternalLink className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  const updatedLabel = lastUpdatedAt ? new Date(lastUpdatedAt).toLocaleString() : "—";
  const showVotingCard = (isFullAdmin || isManager) && hasFeature("voting");

  return (
    <div className="text-left">
      <div className={`grid grid-cols-1 gap-6 ${showVotingCard ? "xl:grid-cols-3" : ""}`}>
        <div className={`rounded-2xl border border-slate-100 bg-white p-6 shadow-[0_6px_24px_rgba(2,6,23,0.06)] ${showVotingCard ? "xl:col-span-2" : ""}`}>
          <div className="flex items-start sm:items-center justify-between gap-4 flex-col sm:flex-row">
            <div className="min-w-0">
              <h2 className="text-xl md:text-2xl font-extrabold text-gray-900 text-left">Recent Activity</h2>
              <div className="mt-3 text-sm text-gray-600 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="text-left">
                  <span className="font-semibold">Last updated:</span> {updatedLabel}
                </div>
                <div className="text-left text-gray-500">Auto-updates when payments/votes/tickets change.</div>
              </div>
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
        </div>

        {showVotingCard && (
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-[0_6px_24px_rgba(2,6,23,0.06)]">
            <div className="flex items-center gap-3">
              <span className="inline-flex w-11 h-11 rounded-full bg-violet-100 items-center justify-center flex-shrink-0">
                <Calendar className="w-5 h-5 text-violet-700" />
              </span>
              <div>
                <div className="font-extrabold text-gray-900 inline-flex items-center gap-2">
                  <Vote className="w-4 h-4 text-gray-600" />
                  Voting start date
                </div>
              </div>
            </div>
            <div className="mt-4">
              <input
                type="date"
                value={votingScheduleDate}
                onChange={(e) => setVotingScheduleDate(e.target.value)}
                disabled={votingScheduleLoading || votingScheduleSaving}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-primary-500 focus:ring-primary-500 disabled:opacity-60"
              />
            </div>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => void saveVotingSchedule()}
                disabled={votingScheduleLoading || votingScheduleSaving}
                className="inline-flex items-center justify-center rounded-md bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60"
              >
                {votingScheduleSaving ? "Saving…" : "Save date"}
              </button>
              <button
                type="button"
                disabled={!allVotingPublicUrl}
                onClick={async () => {
                  if (!allVotingPublicUrl) return;
                  try {
                    await navigator.clipboard.writeText(allVotingPublicUrl);
                    setAllVotingCopied(true);
                    window.setTimeout(() => setAllVotingCopied(false), 2000);
                  } catch {
                    setVotingScheduleMessage("Could not copy link. Select the URL and copy manually.");
                  }
                }}
                className="inline-flex items-center justify-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-800 hover:bg-gray-50 disabled:opacity-50"
              >
                <Copy className="w-4 h-4" />
                {allVotingCopied ? "Copied" : "Copy link"}
              </button>
            </div>
            <Link
              href="/voting/all"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-primary-700 hover:text-primary-800"
            >
              Preview voting page
              <ExternalLink className="w-4 h-4" />
            </Link>
            {votingScheduleMessage && (
              <p className="mt-3 text-sm text-gray-700 whitespace-pre-wrap">{votingScheduleMessage}</p>
            )}
          </div>
        )}
      </div>

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

      {isAdmin && pendingJobApplications > 0 && (
        <div className="mt-6 rounded-md border border-primary-200 bg-primary-50 p-4 text-primary-950">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="font-extrabold inline-flex items-center gap-2">
                <Briefcase className="w-4 h-4" />
                New job applications to review
              </div>
              <p className="mt-1 text-sm">
                {pendingJobApplications} application{pendingJobApplications !== 1 ? "s are" : " is"} in{" "}
                <strong>pending</strong> status (submitted from the website with documents).
              </p>
            </div>
            <Link
              href="/dashboard/applications"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-primary-300 bg-white hover:bg-primary-100 text-primary-950 text-sm font-semibold shrink-0"
            >
              Open Applications
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}

      {!hasFeature("reports") && (
        <div className="mt-6 rounded-md border border-secondary-200 bg-secondary-50 p-6 text-secondary-900">
          <div className="font-extrabold">Dashboard</div>
          <div className="mt-2 text-sm">
            Summary reports are not enabled for your account. Visit{" "}
            <Link href="/dashboard/campaigns" className="text-gray-600 font-semibold hover:underline">
              campaigns
            </Link>{" "}
            to manage your campaigns.
          </div>
        </div>
      )}

      {hasFeature("reports") && campaignsCount === 0 && !isFullAdmin && !isManager && (
        <div className="mt-6 rounded-md border border-secondary-200 bg-secondary-50 p-6 text-secondary-900">
          <div className="font-extrabold">No reports yet</div>
          <div className="mt-2 text-sm">
            Your dashboard will show activity once your campaign is live and our agreement is in place. Until then, you will not see any transactions or payment data.
          </div>
        </div>
      )}

      {hasFeature("reports") && (campaignsCount > 0 || isFullAdmin || isManager) && (
      <>
      {/* KPI cards (styled like screenshot tiles) */}
      <div
        className={`mt-6 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 ${dataLoading ? "animate-pulse opacity-[0.65] pointer-events-none" : ""}`}
      >
        <div className="bg-white rounded-2xl shadow-[0_6px_24px_rgba(2,6,23,0.06)] p-6 border border-slate-100 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(2,6,23,0.10)]">
          <div className="flex items-center justify-end">
            <Link
              href="/dashboard/campaigns"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-gray-200 bg-white hover:bg-gray-50 text-gray-800 text-sm font-semibold"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              View More
            </Link>
          </div>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="mt-4 text-sm font-extrabold text-gray-700 text-left">Revenue</div>
                <div className="mt-2 text-2xl font-extrabold text-gray-900 text-left">{formatRevenue}</div>
              </div>
              <span className="inline-flex w-10 h-10 rounded-full bg-violet-100 items-center justify-center">
                <Wallet className="w-5 h-5 text-gray-600" />
              </span>
            </div>
        </div>

        <div className="bg-white rounded-2xl shadow-[0_6px_24px_rgba(2,6,23,0.06)] p-6 border border-slate-100 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(2,6,23,0.10)]">
          <div className="flex items-center justify-end">
            <Link
              href="/dashboard/campaigns?type=ticket"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-gray-200 bg-white hover:bg-gray-50 text-gray-800 text-sm font-semibold"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              View More
            </Link>
          </div>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="mt-4 text-sm font-extrabold text-gray-700 text-left">Revenue (tickets)</div>
                <div className="mt-2 text-2xl font-extrabold text-gray-900 text-left">{formatRevenueTickets}</div>
              </div>
              <span className="inline-flex w-10 h-10 rounded-full bg-emerald-100 items-center justify-center">
                <Ticket className="w-5 h-5 text-primary-700" />
              </span>
            </div>
        </div>

        <div className="bg-white rounded-2xl shadow-[0_6px_24px_rgba(2,6,23,0.06)] p-6 border border-slate-100 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(2,6,23,0.10)]">
          <div className="flex items-center justify-end">
            <Link
              href="/dashboard/campaigns?type=vote"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-gray-200 bg-white hover:bg-gray-50 text-gray-800 text-sm font-semibold"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              View More
            </Link>
          </div>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="mt-4 text-sm font-extrabold text-gray-700 text-left">Revenue (votes)</div>
                <div className="mt-2 text-2xl font-extrabold text-gray-900 text-left">{formatRevenueVotes}</div>
              </div>
              <span className="inline-flex w-10 h-10 rounded-full bg-rose-100 items-center justify-center">
                <Vote className="w-5 h-5 text-secondary-700" />
              </span>
            </div>
        </div>

        <div className="bg-white rounded-2xl shadow-[0_6px_24px_rgba(2,6,23,0.06)] p-6 border border-slate-100 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(2,6,23,0.10)]">
          <div className="flex items-center justify-end">
            <Link
              href="/merchandise"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-gray-200 bg-white hover:bg-gray-50 text-gray-800 text-sm font-semibold"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              View
            </Link>
          </div>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="mt-4 text-sm font-extrabold text-gray-700 text-left">Revenue (merchandise)</div>
                <div className="mt-2 text-2xl font-extrabold text-gray-900 text-left">{formatRevenueMerchandise}</div>
              </div>
              <span className="inline-flex w-10 h-10 rounded-full bg-amber-100 items-center justify-center">
                <ShoppingBag className="w-5 h-5 text-amber-700" />
              </span>
            </div>
        </div>

        <div className="bg-white rounded-2xl shadow-[0_6px_24px_rgba(2,6,23,0.06)] p-6 border border-slate-100 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(2,6,23,0.10)]">
          <div className="flex items-center justify-end">
            <Link
              href="/dashboard/campaigns"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-gray-200 bg-white hover:bg-gray-50 text-gray-800 text-sm font-semibold"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              View More
            </Link>
          </div>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="mt-4 text-sm font-extrabold text-gray-700 text-left">Successful payments</div>
                <div className="mt-2 text-2xl font-extrabold text-gray-900 text-left">{successfulPayments.toLocaleString()}</div>
              </div>
              <span className="inline-flex w-10 h-10 rounded-full bg-indigo-100 items-center justify-center">
                <Shield className="w-5 h-5 text-gray-600" />
              </span>
            </div>
        </div>

        <div className="bg-white rounded-2xl shadow-[0_6px_24px_rgba(2,6,23,0.06)] p-6 border border-slate-100 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(2,6,23,0.10)]">
          <div className="flex items-center justify-end">
            <Link
              href="/dashboard/campaigns"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-gray-200 bg-white hover:bg-gray-50 text-gray-800 text-sm font-semibold"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              View More
            </Link>
          </div>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="mt-4 text-sm font-extrabold text-gray-700 text-left">Tickets issued</div>
                <div className="mt-2 text-2xl font-extrabold text-gray-900 text-left">{totalTicketsIssued.toLocaleString()}</div>
              </div>
              <span className="inline-flex w-10 h-10 rounded-full bg-cyan-100 items-center justify-center">
                <Ticket className="w-5 h-5 text-gray-600" />
              </span>
            </div>
        </div>

        <div className="bg-white rounded-2xl shadow-[0_6px_24px_rgba(2,6,23,0.06)] p-6 border border-slate-100 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(2,6,23,0.10)]">
          <div className="flex items-center justify-end">
            <Link
              href="/dashboard/campaigns"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-gray-200 bg-white hover:bg-gray-50 text-gray-800 text-sm font-semibold"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              View More
            </Link>
          </div>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="mt-4 text-sm font-extrabold text-gray-700 text-left">Votes counted</div>
                <div className="mt-2 text-2xl font-extrabold text-gray-900 text-left">{totalVotes.toLocaleString()}</div>
              </div>
              <span className="inline-flex w-10 h-10 rounded-full bg-fuchsia-100 items-center justify-center">
                <Vote className="w-5 h-5 text-gray-600" />
              </span>
            </div>
        </div>

        {isAdmin && (
          <div className="bg-white rounded-2xl shadow-[0_6px_24px_rgba(2,6,23,0.06)] p-6 border border-slate-100 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(2,6,23,0.10)]">
            <div className="flex items-center justify-end">
              <Link
                href="/dashboard/kcm-membership"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-gray-200 bg-white hover:bg-gray-50 text-gray-800 text-sm font-semibold"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                View More
              </Link>
            </div>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="mt-4 text-sm font-extrabold text-gray-700 text-left">KCM membership paid</div>
                <div className="mt-2 text-2xl font-extrabold text-gray-900 text-left">
                  KES {kcmMembershipPaidKes.toLocaleString()}
                </div>
                <div className="mt-2 text-sm text-gray-600 text-left">
                  Contributions: <span className="font-semibold text-secondary-700">KES {kcmContributionsKes.toLocaleString()}</span>
                </div>
                <div className="mt-1 text-xs text-gray-500 text-left">
                  Paid members: {kcmMembershipPaidCount.toLocaleString()}
                </div>
              </div>
              <span className="inline-flex w-10 h-10 rounded-full bg-primary-100 items-center justify-center">
                <Crown className="w-5 h-5 text-primary-700" />
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Summary tiles */}
      <div className={`mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6 ${dataLoading ? "animate-pulse opacity-[0.65] pointer-events-none" : ""}`}>
        <div className="bg-white rounded-2xl shadow-[0_6px_24px_rgba(2,6,23,0.06)] p-6 border border-slate-100 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(2,6,23,0.10)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm font-extrabold text-gray-700 text-left">Total campaigns</div>
              <div className="mt-2 text-2xl font-extrabold text-gray-900 text-left">{campaignsCount.toLocaleString()}</div>
              <div className="mt-2 text-sm text-gray-600 text-left">
                Active: <span className="font-semibold text-secondary-700">{activeCampaignsCount}</span> · Inactive:{" "}
                <span className="font-semibold text-gray-600">{inactiveCampaignsCount}</span>
              </div>
            </div>
            <span className="inline-flex w-10 h-10 rounded-full bg-slate-100 items-center justify-center">
              <ExternalLink className="w-5 h-5 text-gray-500" />
            </span>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-[0_6px_24px_rgba(2,6,23,0.06)] p-6 border border-slate-100 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(2,6,23,0.10)]">
          <div className="flex flex-wrap gap-3">
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
      <div
        className={`mt-8 bg-white rounded-2xl shadow-[0_6px_24px_rgba(2,6,23,0.06)] border border-slate-100 overflow-hidden ${dataLoading ? "animate-pulse opacity-[0.65]" : ""}`}
      >
        <div className="p-6 border-b border-gray-200 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="text-sm font-extrabold text-gray-700 text-left">Recent Payments</div>
            {!isAdmin && (
              <p className="mt-2 text-xs text-gray-500 max-w-xl text-left">
                Incomplete checkouts are hidden here. You&apos;ll get an email when a payer doesn&apos;t finish — successful
                payments still show as usual.
              </p>
            )}
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
              href="/dashboard/transactions"
              className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-md border border-gray-200 hover:bg-gray-50 text-gray-900 font-semibold"
            >
              All transactions
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

