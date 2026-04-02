"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Briefcase,
  Calendar,
  Copy,
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
  const [certificateRequests, setCertificateRequests] = useState<
    Array<{ id: string; name: string; requested_at: string; campaign_title: string }>
  >([]);
  const [pendingJobApplications, setPendingJobApplications] = useState(0);

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
      // Only full admins see all campaigns; managers and clients see only their own.
      let campaignsQuery = supabase
        .from("campaigns")
        .select("id,title,type,slug,is_active,created_at")
        .order("created_at", { ascending: false });

      if (!isFullAdmin && user?.id) {
        campaignsQuery = campaignsQuery.eq("created_by", user.id);
      }

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

      if (!hasCampaigns) {
        setRecentTransactions([]);
        setSuccessfulPayments(0);
        setRevenueByCurrency({});
        setRevenueByCurrencyTickets({});
        setRevenueByCurrencyVotes({});
        setRevenueByCurrencyMerchandise({});
        setTotalVotes(0);
        setTotalTicketsIssued(0);
        setCertificateRequests([]);
      } else {
        const [txRes, successTx, voteRows, ticketRows, certRes] = await Promise.all([
          supabase
            .from("transactions")
            .select("id,reference,status,amount,currency,created_at,campaign_id,provider,email,payer_name")
            .in("campaign_id", campaignIds)
            .order("created_at", { ascending: false })
            .limit(10),
          fetchAllSupabasePages(async (from, to) => {
            const r = await supabase
              .from("transactions")
              .select("amount,currency,campaign_type,campaign_id")
              .eq("status", "success")
              .in("campaign_id", campaignIds)
              .order("id", { ascending: true })
              .range(from, to);
            return { data: r.data as any[] | null, error: r.error };
          }),
          fetchAllSupabasePages(async (from, to) => {
            const r = await supabase
              .from("votes")
              .select("votes,campaign_id")
              .in("campaign_id", campaignIds)
              .order("id", { ascending: true })
              .range(from, to);
            return { data: r.data as any[] | null, error: r.error };
          }),
          fetchAllSupabasePages(async (from, to) => {
            const r = await supabase
              .from("ticket_issues")
              .select("quantity,campaign_id")
              .in("campaign_id", campaignIds)
              .order("id", { ascending: true })
              .range(from, to);
            return { data: r.data as any[] | null, error: r.error };
          }),
          supabase
            .from("contestants")
            .select("id,name,campaign_id,certificate_requested_at,certificate_approved_at,certificate_downloaded_at")
            .in("campaign_id", campaignIds)
            .not("certificate_requested_at", "is", null)
            .is("certificate_approved_at", null)
            .is("certificate_downloaded_at", null)
            .order("certificate_requested_at", { ascending: false })
            .limit(6),
        ]);

        if (txRes.error) throw txRes.error;
        const rawTx = (txRes.data ?? []) as any[];
        const visibleTx = isAdmin
          ? rawTx
          : rawTx.filter((t) => t.status !== "failed" && t.status !== "abandoned");
        setRecentTransactions(visibleTx);

        setSuccessfulPayments(successTx.length);
        const rev: Record<string, number> = {};
        const revTickets: Record<string, number> = {};
        const revVotes: Record<string, number> = {};
        const revMerchandise: Record<string, number> = {};
        for (const t of successTx as any[]) {
          const cur = String(t.currency ?? "").toUpperCase() || "—";
          const amt = Number(t.amount ?? 0);
          const ctype = String(t.campaign_type ?? "").toLowerCase();
          const isMerchandise = merchandiseCampaignId && String(t.campaign_id ?? "") === String(merchandiseCampaignId);
          if (!Number.isFinite(amt)) continue;
          rev[cur] = (rev[cur] ?? 0) + amt;
          if (isMerchandise) {
            revMerchandise[cur] = (revMerchandise[cur] ?? 0) + amt;
          } else if (ctype === "vote") {
            revVotes[cur] = (revVotes[cur] ?? 0) + amt;
          } else if (ctype === "ticket") {
            revTickets[cur] = (revTickets[cur] ?? 0) + amt;
          }
        }
        setRevenueByCurrency(rev);
        setRevenueByCurrencyTickets(revTickets);
        setRevenueByCurrencyVotes(revVotes);
        setRevenueByCurrencyMerchandise(revMerchandise);

        setTotalVotes(voteRows.reduce((acc: number, r: any) => acc + (Number(r.votes ?? 0) || 0), 0));

        setTotalTicketsIssued(
          ticketRows.reduce((acc: number, r: any) => acc + (Number(r.quantity ?? 0) || 0), 0)
        );

        if (certRes.error) {
          const msg = String(certRes.error.message ?? "").toLowerCase();
          if (!msg.includes("certificate_requested_at")) throw certRes.error;
          setCertificateRequests([]);
        } else {
          const mapped = ((certRes.data ?? []) as any[]).map((r) => ({
            id: String(r.id),
            name: String(r.name ?? "Contestant"),
            requested_at: String(r.certificate_requested_at),
            campaign_title: titleMap[String(r.campaign_id)]?.title ?? "Voting category",
          }));
          setCertificateRequests(mapped);
        }
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
        // Require portal 2FA: code must have been verified this session.
        const statusRes = await fetch("/api/fusion-xpress/login-status", { credentials: "include" });
        const status = (await statusRes.json().catch(() => ({}))) as { verified?: boolean };
        if (!cancelled && !status.verified) {
          router.replace("/fusion-xpress");
          return;
        }
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
      .on("postgres_changes", { event: "*", schema: "public", table: "transactions" }, () => refreshData())
      .on("postgres_changes", { event: "*", schema: "public", table: "votes" }, () => refreshData())
      .on("postgres_changes", { event: "*", schema: "public", table: "ticket_issues" }, () => refreshData())
      .on("postgres_changes", { event: "*", schema: "public", table: "contestants" }, () => refreshData())
      .on("postgres_changes", { event: "*", schema: "public", table: "campaigns" }, () => refreshData())
      .subscribe();

    const interval = window.setInterval(() => refreshData(), 15_000);

    return () => {
      window.clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [isPortalMember, refreshData, user?.id, isEmployer]);

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

      {isManager && (
        <div className="mt-6 rounded-md border border-secondary-200 bg-secondary-50 p-4 text-secondary-900">
          <div className="font-extrabold">Manager access</div>
          <div className="mt-1 text-sm">
            You can add clients and manage campaigns. Only full admins can add other admins or managers.
          </div>
        </div>
      )}

      {(isFullAdmin || isManager) && hasFeature("voting") && (
        <div className="mt-6 rounded-md border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <span className="inline-flex w-10 h-10 rounded-lg bg-primary-50 items-center justify-center flex-shrink-0">
              <Calendar className="w-5 h-5 text-primary-700" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="font-extrabold text-gray-900 inline-flex items-center gap-2">
                <Vote className="w-4 h-4 text-gray-600" />
                Voting start date
              </div>
              <p className="mt-1 text-sm text-gray-600">
                Public voting links stay on a &ldquo;not open yet&rdquo; screen until this calendar day (midnight East Africa Time).
                {votingScheduleDisplay && !votingScheduleLoading ? (
                  <span className="block mt-1 font-medium text-gray-800">Currently: {votingScheduleDisplay}</span>
                ) : null}
              </p>
              <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
                <div className="font-semibold text-gray-900">Master voting link (all categories)</div>
                <p className="mt-1 text-sm text-gray-600">
                  Share one URL that lists every open voting category and contestant. Category-specific voting URLs are
                  unchanged; this page unlocks on the same schedule as those links.
                </p>
                <div className="mt-3 flex flex-col sm:flex-row gap-2 sm:items-center">
                  <input
                    type="text"
                    readOnly
                    value={allVotingPublicUrl}
                    placeholder="Building link…"
                    className="flex-1 min-w-0 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 font-mono"
                  />
                  <div className="flex gap-2 shrink-0">
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
                      className="inline-flex items-center justify-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50 disabled:opacity-50"
                    >
                      <Copy className="w-4 h-4" />
                      {allVotingCopied ? "Copied" : "Copy"}
                    </button>
                    <Link
                      href="/voting/all"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700"
                    >
                      Preview
                      <ExternalLink className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex flex-col sm:flex-row sm:items-end gap-3">
                <label className="block text-sm">
                  <span className="font-semibold text-gray-700">First day voting is open</span>
                  <input
                    type="date"
                    value={votingScheduleDate}
                    onChange={(e) => setVotingScheduleDate(e.target.value)}
                    disabled={votingScheduleLoading || votingScheduleSaving}
                    className="mt-1 block w-full sm:w-56 rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-primary-500 focus:ring-primary-500 disabled:opacity-60"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => void saveVotingSchedule()}
                  disabled={votingScheduleLoading || votingScheduleSaving}
                  className="inline-flex items-center justify-center rounded-md bg-primary-600 px-4 py-2.5 font-semibold text-white hover:bg-primary-700 disabled:opacity-60"
                >
                  {votingScheduleSaving ? "Saving…" : "Save schedule"}
                </button>
              </div>
              {votingScheduleMessage && (
                <p className="mt-3 text-sm text-gray-700 whitespace-pre-wrap">{votingScheduleMessage}</p>
              )}
            </div>
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

      {certificateRequests.length > 0 && (
        <div className="mt-6 rounded-md border border-amber-200 bg-amber-50 p-4 text-amber-900">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="font-extrabold inline-flex items-center gap-2">
                <Bell className="w-4 h-4" />
                Certificate requests pending approval
              </div>
              <p className="mt-1 text-sm">
                {certificateRequests.length} contestant{certificateRequests.length !== 1 ? "s have" : " has"} requested a participation certificate.
              </p>
              <p className="mt-2 text-sm">
                Latest:{" "}
                {certificateRequests
                  .slice(0, 3)
                  .map((r) => `${r.name} (${r.campaign_title})`)
                  .join(" • ")}
              </p>
            </div>
            <Link
              href="/dashboard/contestants"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-amber-300 bg-white hover:bg-amber-100 text-amber-900 text-sm font-semibold"
            >
              Review
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
        <div className="bg-white rounded-md shadow-sm p-6 border border-gray-200 ">
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
              <span className="inline-flex w-10 h-10 rounded bg-gray-100 items-center justify-center">
                <Wallet className="w-5 h-5 text-gray-600" />
              </span>
            </div>
        </div>

        <div className="bg-white rounded-md shadow-sm p-6 border border-gray-200 ">
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
              <span className="inline-flex w-10 h-10 rounded bg-primary-50 items-center justify-center">
                <Ticket className="w-5 h-5 text-primary-700" />
              </span>
            </div>
        </div>

        <div className="bg-white rounded-md shadow-sm p-6 border border-gray-200 ">
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
              <span className="inline-flex w-10 h-10 rounded bg-secondary-50 items-center justify-center">
                <Vote className="w-5 h-5 text-secondary-700" />
              </span>
            </div>
        </div>

        <div className="bg-white rounded-md shadow-sm p-6 border border-gray-200 ">
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
              <span className="inline-flex w-10 h-10 rounded bg-amber-50 items-center justify-center">
                <ShoppingBag className="w-5 h-5 text-amber-700" />
              </span>
            </div>
        </div>

        <div className="bg-white rounded-md shadow-sm p-6 border border-gray-200 ">
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
              <span className="inline-flex w-10 h-10 rounded bg-gray-100 items-center justify-center">
                <Shield className="w-5 h-5 text-gray-600" />
              </span>
            </div>
        </div>

        <div className="bg-white rounded-md shadow-sm p-6 border border-gray-200 ">
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
              <span className="inline-flex w-10 h-10 rounded bg-gray-100 items-center justify-center">
                <Ticket className="w-5 h-5 text-gray-600" />
              </span>
            </div>
        </div>

        <div className="bg-white rounded-md shadow-sm p-6 border border-gray-200 ">
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
              <span className="inline-flex w-10 h-10 rounded bg-gray-100 items-center justify-center">
                <Vote className="w-5 h-5 text-gray-600" />
              </span>
            </div>
        </div>
      </div>

      {/* Summary tiles */}
      <div className={`mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6 ${dataLoading ? "animate-pulse opacity-[0.65] pointer-events-none" : ""}`}>
        <div className="bg-white rounded-md shadow-sm p-6 border border-gray-200">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm font-extrabold text-gray-700 text-left">Total campaigns</div>
              <div className="mt-2 text-2xl font-extrabold text-gray-900 text-left">{campaignsCount.toLocaleString()}</div>
              <div className="mt-2 text-sm text-gray-600 text-left">
                Active: <span className="font-semibold text-secondary-700">{activeCampaignsCount}</span> · Inactive:{" "}
                <span className="font-semibold text-gray-600">{inactiveCampaignsCount}</span>
              </div>
            </div>
            <span className="inline-flex w-10 h-10 rounded bg-gray-100 items-center justify-center">
              <ExternalLink className="w-5 h-5 text-gray-500" />
            </span>
          </div>
        </div>

        <div className="bg-white rounded-md shadow-sm p-6 border border-gray-200">
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
        className={`mt-8 bg-white rounded-md shadow-sm border border-gray-200 overflow-hidden ${dataLoading ? "animate-pulse opacity-[0.65]" : ""}`}
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

