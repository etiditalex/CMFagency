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
import { reconcileStalePendingTransactionsInBackground } from "@/lib/reconcile-pending-transaction-refs";
import { supabase } from "@/lib/supabase";
import { FALLBACK_VOTING_END_MS, lastVotingDayYmdFromEndIso } from "@/lib/voting-schedule-public";

type TrendingItem = {
  rank: number;
  contestantId: string;
  name: string;
  category: string;
  votes: number;
  imageUrl: string | null;
};

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

function formatVotingDateInNairobi(iso: string): string {
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

const VOTING_START_FALLBACK_ISO = "2026-04-01T00:00:00+03:00";
const VOTING_END_FALLBACK_ISO = new Date(FALLBACK_VOTING_END_MS).toISOString();

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
  const [votingScheduleEndDate, setVotingScheduleEndDate] = useState("");
  const [votingScheduleDisplay, setVotingScheduleDisplay] = useState("");
  const [votingScheduleEndDisplay, setVotingScheduleEndDisplay] = useState("");
  const [votingScheduleLoading, setVotingScheduleLoading] = useState(false);
  const [votingScheduleSaving, setVotingScheduleSaving] = useState(false);
  const [votingScheduleMessage, setVotingScheduleMessage] = useState<string | null>(null);
  const [allVotingCopied, setAllVotingCopied] = useState(false);
  const [allVotingPublicUrl, setAllVotingPublicUrl] = useState("");

  const [trendingLoading, setTrendingLoading] = useState(false);
  const [trendingError, setTrendingError] = useState<string | null>(null);
  const [trendingWeekLabel, setTrendingWeekLabel] = useState<string>("");
  const [trendingItems, setTrendingItems] = useState<TrendingItem[]>([]);

  const refreshInFlightRef = useRef(false);

  useEffect(() => {
    const base = (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "");
    setAllVotingPublicUrl(base ? `${base}/voting/all` : `${window.location.origin}/voting/all`);
  }, []);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ updated?: number; error?: string; detail?: string } | null>(null);
  const realtimeRefreshTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isAdmin) {
      setPendingJobApplications(0);
    }
  }, [isAdmin]);

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
        const j = (await res.json()) as { voting_starts_at?: string | null; voting_ends_at?: string | null };
        if (cancelled) return;
        const effectiveStart = j?.voting_starts_at || VOTING_START_FALLBACK_ISO;
        const effectiveEnd = j?.voting_ends_at || VOTING_END_FALLBACK_ISO;
        setVotingScheduleDate(isoToNairobiDateInput(effectiveStart) || "2026-04-01");
        setVotingScheduleEndDate(lastVotingDayYmdFromEndIso(effectiveEnd) || isoToNairobiDateInput(effectiveEnd));
        setVotingScheduleDisplay(formatVotingDateInNairobi(effectiveStart));
        setVotingScheduleEndDisplay(formatVotingDateInNairobi(effectiveEnd));
      } catch {
        if (!cancelled) {
          setVotingScheduleDate("2026-04-01");
          setVotingScheduleEndDate(
            lastVotingDayYmdFromEndIso(VOTING_END_FALLBACK_ISO) || isoToNairobiDateInput(VOTING_END_FALLBACK_ISO)
          );
          setVotingScheduleDisplay(formatVotingDateInNairobi(VOTING_START_FALLBACK_ISO));
          setVotingScheduleEndDisplay(formatVotingDateInNairobi(VOTING_END_FALLBACK_ISO));
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
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("Session expired. Please sign in again.");

      const res = await fetch("/api/fusion-xpress/dashboard-summary", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const j = (await res.json().catch(() => ({}))) as {
        error?: string;
        campaignsCount?: number;
        activeCampaignsCount?: number;
        inactiveCampaignsCount?: number;
        campaignTitleById?: Record<string, { title: string; type: string }>;
        recentTransactions?: typeof recentTransactions;
        successfulPayments?: number;
        revenueByCurrency?: Record<string, number>;
        revenueByCurrencyTickets?: Record<string, number>;
        revenueByCurrencyVotes?: Record<string, number>;
        revenueByCurrencyMerchandise?: Record<string, number>;
        totalVotes?: number;
        totalTicketsIssued?: number;
        kcmSummary?: {
          totalMembershipPaidKes?: number;
          membershipPaidCount?: number;
          totalContributionKes?: number;
        } | null;
        pendingJobApplications?: number;
      };

      if (!res.ok) throw new Error(String(j?.error ?? `Failed (${res.status})`));

      setCampaignsCount(Number(j.campaignsCount ?? 0));
      setActiveCampaignsCount(Number(j.activeCampaignsCount ?? 0));
      setInactiveCampaignsCount(Number(j.inactiveCampaignsCount ?? 0));
      setCampaignTitleById(j.campaignTitleById ?? {});

      let rawTx = Array.isArray(j.recentTransactions) ? j.recentTransactions : [];
      setRecentTransactions(rawTx);
      reconcileStalePendingTransactionsInBackground(rawTx, () => {
        void (async () => {
          const again = await supabase
            .from("transactions")
            .select("id,reference,status,amount,currency,created_at,campaign_id,provider,email,payer_name")
            .order("created_at", { ascending: false })
            .limit(10);
          if (!again.error && again.data) setRecentTransactions(again.data as typeof recentTransactions);
        })();
      });

      setSuccessfulPayments(Number(j.successfulPayments ?? 0));
      setRevenueByCurrency(j.revenueByCurrency ?? {});
      setRevenueByCurrencyTickets(j.revenueByCurrencyTickets ?? {});
      setRevenueByCurrencyVotes(j.revenueByCurrencyVotes ?? {});
      setRevenueByCurrencyMerchandise(j.revenueByCurrencyMerchandise ?? {});
      setTotalVotes(Number(j.totalVotes ?? 0));
      setTotalTicketsIssued(Number(j.totalTicketsIssued ?? 0));

      if (hasFeature("kcm_membership") && j.kcmSummary) {
        setKcmMembershipPaidKes(Number(j.kcmSummary.totalMembershipPaidKes ?? 0) || 0);
        setKcmMembershipPaidCount(Number(j.kcmSummary.membershipPaidCount ?? 0) || 0);
        setKcmContributionsKes(Number(j.kcmSummary.totalContributionKes ?? 0) || 0);
      } else {
        setKcmMembershipPaidKes(0);
        setKcmMembershipPaidCount(0);
        setKcmContributionsKes(0);
      }

      if (isAdmin) {
        setPendingJobApplications(Number(j.pendingJobApplications ?? 0));
      }

      setLastUpdatedAt(new Date().toISOString());
    } catch (e: any) {
      const parts = [e?.message, e?.details, e?.hint, e?.code ? `code=${e.code}` : null].filter(Boolean);
      setError(parts.length ? parts.join("\n") : "Failed to load dashboard reports");
    } finally {
      setDataLoading(false);
      refreshInFlightRef.current = false;
    }
  }, [user?.id, isEmployer, isAdmin, hasFeature]);

  const loadTrending = useCallback(async () => {
    if (!hasFeature("voting")) return;
    if (!isFullAdmin && !isManager) return;
    setTrendingLoading(true);
    setTrendingError(null);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        setTrendingError("Session expired. Please sign in again.");
        setTrendingItems([]);
        setTrendingWeekLabel("");
        return;
      }
      const res = await fetch("/api/fusion-xpress/analytics/trending-contestants", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const j = (await res.json().catch(() => ({}))) as {
        error?: string;
        week?: { label?: string };
        items?: TrendingItem[];
      };
      if (!res.ok) {
        setTrendingError(String(j?.error ?? `Failed (${res.status})`));
        setTrendingItems([]);
        setTrendingWeekLabel("");
        return;
      }
      setTrendingWeekLabel(String(j?.week?.label ?? ""));
      setTrendingItems(Array.isArray(j?.items) ? j.items : []);
    } catch (e: unknown) {
      setTrendingError(e instanceof Error ? e.message : "Failed to load trending contestants");
      setTrendingItems([]);
      setTrendingWeekLabel("");
    } finally {
      setTrendingLoading(false);
    }
  }, [hasFeature, isFullAdmin, isManager]);

  const scheduleRefresh = useCallback(() => {
    if (realtimeRefreshTimeoutRef.current) return;
    realtimeRefreshTimeoutRef.current = window.setTimeout(() => {
      realtimeRefreshTimeoutRef.current = null;
      void refreshData();
    }, 5000);
  }, [refreshData]);

  const syncPendingPayments = useCallback(async () => {
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
      const headers = { Authorization: `Bearer ${token}` };
      const [paystackRes, darajaRes] = await Promise.all([
        fetch("/api/paystack/sync-pending", { headers }),
        fetch("/api/daraja/sync-pending", { headers }),
      ]);
      const paystackJson = (await paystackRes.json()) as { updated?: number; error?: string };
      const darajaJson = (await darajaRes.json()) as {
        updated?: number;
        marked_success?: number;
        marked_failed?: number;
        still_pending?: number;
        error?: string;
      };

      if (!paystackRes.ok && !darajaRes.ok) {
        setSyncResult({
          error: paystackJson?.error ?? darajaJson?.error ?? `HTTP ${paystackRes.status}`,
        });
        return;
      }

      const totalUpdated = (paystackJson.updated ?? 0) + (darajaJson.updated ?? 0);
      const parts: string[] = [];
      if ((darajaJson.marked_success ?? 0) > 0) parts.push(`${darajaJson.marked_success} M-Pesa paid`);
      if ((darajaJson.marked_failed ?? 0) > 0) parts.push(`${darajaJson.marked_failed} M-Pesa failed`);
      if ((paystackJson.updated ?? 0) > 0) parts.push(`${paystackJson.updated} Paystack updated`);
      if ((darajaJson.still_pending ?? 0) > 0) {
        parts.push(`${darajaJson.still_pending} still processing at Safaricom`);
      }

      setSyncResult({
        updated: totalUpdated,
        detail:
          parts.length > 0
            ? parts.join(" · ")
            : totalUpdated === 0
              ? "All payments already confirmed."
              : undefined,
      });
      if (totalUpdated > 0) await refreshData();
    } catch (e: any) {
      setSyncResult({ error: e?.message ?? "Sync failed" });
    } finally {
      setSyncing(false);
    }
  }, [user, refreshData]);

  const saveVotingSchedule = useCallback(async () => {
    const isDateOnly = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v);
    if (!isDateOnly(votingScheduleDate)) {
      setVotingScheduleMessage("Use a valid start date (YYYY-MM-DD).");
      return;
    }
    if (!isDateOnly(votingScheduleEndDate)) {
      setVotingScheduleMessage("Use a valid end date (YYYY-MM-DD).");
      return;
    }
    if (votingScheduleEndDate < votingScheduleDate) {
      setVotingScheduleMessage("The end date must be on or after the start date.");
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
        body: JSON.stringify({ date: votingScheduleDate, end_date: votingScheduleEndDate }),
      });
      const j = (await res.json().catch(() => ({}))) as {
        error?: string;
        voting_starts_at?: string;
        voting_ends_at?: string;
      };
      if (!res.ok) {
        setVotingScheduleMessage(String(j?.error ?? `HTTP ${res.status}`));
        return;
      }
      if (j.voting_starts_at) setVotingScheduleDisplay(formatVotingDateInNairobi(j.voting_starts_at));
      if (j.voting_ends_at) setVotingScheduleEndDisplay(formatVotingDateInNairobi(j.voting_ends_at));
      setVotingScheduleMessage(
        "Saved. Voting opens at 00:00 and closes at midnight (12:00 AM) East Africa Time after the end date."
      );
    } catch (e: any) {
      setVotingScheduleMessage(e?.message ?? "Save failed");
    } finally {
      setVotingScheduleSaving(false);
    }
  }, [votingScheduleDate, votingScheduleEndDate]);

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
        await Promise.all([refreshData(), loadTrending()]);
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Unable to load dashboard");
        if (!cancelled) setSessionChecking(false);
      }
    };

    init();
    return () => {
      cancelled = true;
    };
  }, [authLoading, isAuthenticated, isPortalMember, portalLoading, refreshData, loadTrending, router, user]);

  useEffect(() => {
    if (!isPortalMember || !user?.id || isEmployer) return;

    const channel = supabase
      .channel(`fusion-xpress-dashboard-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "transactions" }, scheduleRefresh)
      .subscribe();

    const interval = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      void refreshData();
    }, 120_000);

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
  const showTrending = showVotingCard;

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
                  Voting dates
                </div>
                <div className="mt-1 text-xs text-gray-600">
                  {votingScheduleDisplay || votingScheduleEndDisplay
                    ? `Opens ${votingScheduleDisplay || "—"} · Closes ${votingScheduleEndDisplay || "—"}`
                    : "East Africa Time"}
                </div>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="voting-start-date" className="block text-xs font-semibold text-gray-700">
                  Start date
                </label>
                <input
                  id="voting-start-date"
                  type="date"
                  value={votingScheduleDate}
                  onChange={(e) => setVotingScheduleDate(e.target.value)}
                  disabled={votingScheduleLoading || votingScheduleSaving}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-primary-500 focus:ring-primary-500 disabled:opacity-60"
                />
              </div>
              <div>
                <label htmlFor="voting-end-date" className="block text-xs font-semibold text-gray-700">
                  End date
                </label>
                <input
                  id="voting-end-date"
                  type="date"
                  value={votingScheduleEndDate}
                  min={votingScheduleDate || undefined}
                  onChange={(e) => setVotingScheduleEndDate(e.target.value)}
                  disabled={votingScheduleLoading || votingScheduleSaving}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-primary-500 focus:ring-primary-500 disabled:opacity-60"
                />
              </div>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Voting is open all of the end date and stops at midnight (12:00 AM) East Africa Time. Official winner and contestant PDFs are emailed to the admin at close.
            </p>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => void saveVotingSchedule()}
                disabled={votingScheduleLoading || votingScheduleSaving}
                className="inline-flex items-center justify-center rounded-md bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60"
              >
                {votingScheduleSaving ? "Saving…" : "Save dates"}
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

      {showTrending && (
        <div
          className={`mt-6 bg-white rounded-2xl shadow-[0_6px_24px_rgba(2,6,23,0.06)] border border-slate-100 overflow-hidden ${
            trendingLoading ? "animate-pulse opacity-[0.85]" : ""
          }`}
        >
          <div className="p-6 border-b border-gray-200 flex items-start justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <div className="font-extrabold text-gray-900 inline-flex items-center gap-2">
                <Crown className="w-4 h-4 text-amber-700" />
                Trending (this week)
              </div>
              <div className="mt-1 text-sm text-gray-600">{trendingWeekLabel || "—"}</div>
              {trendingError && <div className="mt-2 text-sm text-red-700 whitespace-pre-wrap">{trendingError}</div>}
            </div>
            <button
              type="button"
              onClick={() => void loadTrending()}
              disabled={trendingLoading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-gray-200 bg-white hover:bg-gray-50 text-gray-900 font-semibold disabled:opacity-60"
              title="Refresh trending"
            >
              <RefreshCw className={`w-4 h-4 ${trendingLoading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>

          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr className="text-left">
                  <th className="px-6 py-3 font-bold text-gray-600 w-16">Rank</th>
                  <th className="px-6 py-3 font-bold text-gray-600">Contestant</th>
                  <th className="px-6 py-3 font-bold text-gray-600">Category</th>
                  <th className="px-6 py-3 font-bold text-gray-600 w-32">Votes</th>
                </tr>
              </thead>
              <tbody>
                {trendingItems.length === 0 ? (
                  <tr>
                    <td className="px-6 py-6 text-gray-600" colSpan={4}>
                      No votes recorded yet for this week.
                    </td>
                  </tr>
                ) : (
                  trendingItems.slice(0, 10).map((it) => (
                    <tr key={it.contestantId} className="border-b border-gray-100">
                      <td className="px-6 py-4 font-extrabold text-gray-900">#{it.rank}</td>
                      <td className="px-6 py-4 text-gray-900 font-semibold whitespace-nowrap">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="inline-flex w-9 h-9 rounded-full bg-gray-100 overflow-hidden items-center justify-center shrink-0">
                            {it.imageUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={it.imageUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-xs font-bold text-gray-500">
                                {String(it.name ?? "?")
                                  .slice(0, 1)
                                  .toUpperCase()}
                              </span>
                            )}
                          </span>
                          <span className="truncate">{it.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-700">{it.category}</td>
                      <td className="px-6 py-4 text-gray-900 font-extrabold">{Number(it.votes ?? 0).toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
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

        {hasFeature("kcm_membership") && (
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
                {syncResult.error ??
                  syncResult.detail ??
                  `Synced ${syncResult.updated ?? 0} transaction(s).`}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={syncPendingPayments}
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

