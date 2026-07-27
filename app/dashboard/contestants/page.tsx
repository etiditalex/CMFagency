"use client";

import { Fragment, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, Download, ExternalLink, Eye, EyeOff, FileCheck, Trash2, UserPlus } from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { usePortal } from "@/contexts/PortalContext";
import { supabase } from "@/lib/supabase";
import { fetchAllSupabasePages } from "@/lib/supabase-fetch-all-pages";

function isMissingPortalMembersTable(err: unknown) {
  const msg = String((err as { message?: string })?.message ?? "");
  const code = String((err as { code?: string })?.code ?? "");
  return code === "42P01" || (msg.includes("portal_members") && msg.includes("does not exist"));
}

type Campaign = {
  id: string;
  slug: string;
  title: string;
};

type Contestant = {
  id: string;
  campaign_id: string;
  name: string;
  email?: string | null;
  created_at: string;
  sort_order?: number;
  show_vote_total?: boolean | null;
  voting_link_sent_at?: string | null;
  certificate_approved_at?: string | null;
  certificate_downloaded_at?: string | null;
};

function isMissingContestantColumn(err: unknown, columnName: string) {
  const msg = String((err as { message?: string })?.message ?? "").toLowerCase();
  return msg.includes(`contestants.${columnName}`) && (msg.includes("does not exist") || msg.includes("column"));
}

function isMissingContestantEmailColumn(err: unknown) {
  return isMissingContestantColumn(err, "email");
}

function isMissingContestantShowVoteTotalColumn(err: unknown) {
  return isMissingContestantColumn(err, "show_vote_total");
}

type CategoryWithCount = Campaign & { contestant_count: number; contestants: Contestant[] };

/** Supabase nested select shape (client generics don’t infer embedded `contestants` reliably). */
type CampaignRowWithContestants = Campaign & { contestants: Contestant[] | null };

/** Highest vote totals first; ties use sort_order then registration time (created_at ascending). */
function sortContestantsByVoteTotal(list: Contestant[], totals: Map<string, number>): Contestant[] {
  return [...list].sort((a, b) => {
    const va = totals.get(a.id) ?? 0;
    const vb = totals.get(b.id) ?? 0;
    if (vb !== va) return vb - va;
    const sa = a.sort_order ?? 0;
    const sb = b.sort_order ?? 0;
    if (sa !== sb) return sa - sb;
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });
}

async function fetchPendingCertificateRequests(
  campaignIds: string[],
  campaignTitleById: Record<string, string>
): Promise<Array<{ id: string; name: string; requested_at: string; campaign_title: string }>> {
  if (campaignIds.length === 0) return [];
  const certRes = await supabase
    .from("contestants")
    .select("id,name,campaign_id,certificate_requested_at,certificate_approved_at,certificate_downloaded_at")
    .in("campaign_id", campaignIds)
    .not("certificate_requested_at", "is", null)
    .is("certificate_approved_at", null)
    .is("certificate_downloaded_at", null)
    .order("certificate_requested_at", { ascending: false })
    .limit(6);

  if (certRes.error) {
    const msg = String(certRes.error.message ?? "").toLowerCase();
    if (msg.includes("certificate_requested_at")) return [];
    throw certRes.error;
  }

  return ((certRes.data ?? []) as { id: string; name?: string; campaign_id: string; certificate_requested_at: string }[]).map(
    (r) => ({
      id: String(r.id),
      name: String(r.name ?? "Contestant"),
      requested_at: String(r.certificate_requested_at),
      campaign_title: campaignTitleById[String(r.campaign_id)] ?? "Voting category",
    })
  );
}

async function aggregateVoteTotalsByContestant(campaignIds: string[]): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (campaignIds.length === 0) return map;
  const CHUNK = 40;
  for (let i = 0; i < campaignIds.length; i += CHUNK) {
    const chunk = campaignIds.slice(i, i + CHUNK);
    const rows = await fetchAllSupabasePages(async (from, to) => {
      const r = await supabase
        .from("votes")
        .select("contestant_id,votes")
        .in("campaign_id", chunk)
        .order("id", { ascending: true })
        .range(from, to);
      return { data: r.data as { contestant_id: string; votes: number }[] | null, error: r.error };
    });
    for (const row of rows) {
      const id = String(row.contestant_id ?? "");
      const v = Number(row.votes ?? 0) || 0;
      if (!id) continue;
      map.set(id, (map.get(id) ?? 0) + v);
    }
  }
  return map;
}

function mapRowsToCategories(rows: CampaignRowWithContestants[], totals: Map<string, number>): CategoryWithCount[] {
  return rows.map((c) => {
    const list = sortContestantsByVoteTotal(c.contestants ?? [], totals);
    return {
      id: c.id,
      slug: c.slug,
      title: c.title,
      contestant_count: list.length,
      contestants: list,
    };
  });
}

/** One round-trip: campaigns + nested contestants (faster than sequential queries). */
const SELECT_EMBEDDED_FULL = `
  id,
  slug,
  title,
  contestants (
    id,
    campaign_id,
    name,
    email,
    created_at,
    sort_order,
    show_vote_total,
    voting_link_sent_at,
    certificate_approved_at,
    certificate_downloaded_at
  )
`;

const SELECT_EMBEDDED_NO_CERT = `
  id,
  slug,
  title,
  contestants (
    id,
    campaign_id,
    name,
    email,
    created_at,
    sort_order,
    show_vote_total,
    voting_link_sent_at
  )
`;

const SELECT_EMBEDDED_MIN = `
  id,
  slug,
  title,
  contestants (
    id,
    campaign_id,
    name,
    created_at,
    sort_order,
    show_vote_total
  )
`;

const SELECT_EMBEDDED_NO_VOTE_VISIBILITY = `
  id,
  slug,
  title,
  contestants (
    id,
    campaign_id,
    name,
    created_at,
    sort_order
  )
`;

export default function DashboardContestantsPage() {
  const router = useRouter();
  const { isAuthenticated, user, loading: authLoading } = useAuth();
  const { isPortalMember, loading: portalLoading, hasFeature, isFullAdmin } = usePortal();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [missingEmailColumn, setMissingEmailColumn] = useState(false);
  const [missingCertificateColumns, setMissingCertificateColumns] = useState(false);
  const [categories, setCategories] = useState<CategoryWithCount[]>([]);
  const [totalContestants, setTotalContestants] = useState(0);
  const [expandedCategoryId, setExpandedCategoryId] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingVisibilityId, setTogglingVisibilityId] = useState<string | null>(null);
  const [certificateRequests, setCertificateRequests] = useState<
    Array<{ id: string; name: string; requested_at: string; campaign_title: string }>
  >([]);
  const [downloadingAllVotes, setDownloadingAllVotes] = useState(false);

  useEffect(() => {
    if (authLoading || portalLoading) return;
    if (!isAuthenticated || !user || !isPortalMember) {
      router.replace("/fusion-xpress");
      return;
    }
    if (!hasFeature("voting")) {
      router.replace("/dashboard");
      return;
    }

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      setMissingCertificateColumns(false);
      setCertificateRequests([]);

      try {
        const baseCampaignsQuery = (select: string) => {
          let q = supabase.from("campaigns").select(select).eq("type", "vote").order("title");
          if (!isFullAdmin && user?.id) {
            q = q.eq("created_by", user.id);
          }
          return q;
        };

        const applyEmbeddedResult = (rows: CampaignRowWithContestants[] | null, totals: Map<string, number>) => {
          const list = rows ?? [];
          if (list.length === 0) {
            return { categories: [] as CategoryWithCount[], total: 0 };
          }
          const categories = mapRowsToCategories(list, totals);
          const total = categories.reduce((acc, c) => acc + c.contestant_count, 0);
          return { categories, total };
        };

        // Prefer one HTTP round-trip (campaigns + nested contestants).
        let embeddedRows: CampaignRowWithContestants[] | null = null;

        const tryFull = await baseCampaignsQuery(SELECT_EMBEDDED_FULL);
        if (tryFull.error && isMissingContestantEmailColumn(tryFull.error)) {
          setMissingEmailColumn(true);
          const r = await baseCampaignsQuery(SELECT_EMBEDDED_MIN);
          if (r.error) throw r.error;
          embeddedRows = r.data as unknown as CampaignRowWithContestants[];
        } else if (tryFull.error && isMissingContestantShowVoteTotalColumn(tryFull.error)) {
          const r = await baseCampaignsQuery(SELECT_EMBEDDED_NO_VOTE_VISIBILITY);
          if (r.error) throw r.error;
          embeddedRows = r.data as unknown as CampaignRowWithContestants[];
        } else if (
          tryFull.error &&
          String(tryFull.error.message ?? "").toLowerCase().includes("certificate")
        ) {
          setMissingCertificateColumns(true);
          const r = await baseCampaignsQuery(SELECT_EMBEDDED_NO_CERT);
          if (r.error) throw r.error;
          embeddedRows = r.data as unknown as CampaignRowWithContestants[];
        } else if (tryFull.error) {
          const msg = String(tryFull.error.message ?? "").toLowerCase();
          const maybeNoEmbed =
            msg.includes("relationship") ||
            msg.includes("schema cache") ||
            msg.includes("could not find") ||
            tryFull.error.code === "PGRST200";
          if (!maybeNoEmbed) throw tryFull.error;
          embeddedRows = null;
        } else {
          embeddedRows = (tryFull.data ?? []) as unknown as CampaignRowWithContestants[];
        }

        if (embeddedRows !== null) {
          const campaignIds = embeddedRows.map((r) => r.id);
          const voteTotals = await aggregateVoteTotalsByContestant(campaignIds);
          const { categories, total } = applyEmbeddedResult(embeddedRows, voteTotals);
          const titleById = Object.fromEntries(embeddedRows.map((r) => [r.id, r.title]));
          let pending: Array<{ id: string; name: string; requested_at: string; campaign_title: string }> = [];
          try {
            pending = await fetchPendingCertificateRequests(campaignIds, titleById);
          } catch {
            pending = [];
          }
          if (!cancelled) {
            setCategories(categories);
            setTotalContestants(total);
            setCertificateRequests(pending);
          }
          return;
        }

        // Fallback: two queries (older DB clients / missing FK embed).
        let campaignsQuery = supabase
          .from("campaigns")
          .select("id,slug,title")
          .eq("type", "vote")
          .order("title");

        if (!isFullAdmin && user?.id) {
          campaignsQuery = campaignsQuery.eq("created_by", user.id);
        }

        const { data: campaignRows, error: campErr } = await campaignsQuery;
        if (campErr) throw campErr;

        const campaigns = (campaignRows ?? []) as Campaign[];
        if (campaigns.length === 0) {
          if (!cancelled) {
            setCategories([]);
            setTotalContestants(0);
            setCertificateRequests([]);
          }
          return;
        }

        const campaignIds = campaigns.map((c) => c.id);
        let contestantRows: unknown[] | null = null;

        const { data: withCert, error: errWithCert } = await supabase
          .from("contestants")
          .select("id,campaign_id,name,email,created_at,sort_order,voting_link_sent_at,certificate_approved_at,certificate_downloaded_at")
          .in("campaign_id", campaignIds);

        if (errWithCert && isMissingContestantEmailColumn(errWithCert)) {
          setMissingEmailColumn(true);
          const { data: withoutEmail, error: errWithout } = await supabase
            .from("contestants")
            .select("id,campaign_id,name,created_at,sort_order")
            .in("campaign_id", campaignIds);
          if (errWithout) throw errWithout;
          contestantRows = withoutEmail;
        } else if (errWithCert && String(errWithCert.message ?? "").toLowerCase().includes("certificate")) {
          setMissingCertificateColumns(true);
          const { data: withEmail, error: errWithEmail } = await supabase
            .from("contestants")
            .select("id,campaign_id,name,email,created_at,sort_order,voting_link_sent_at")
            .in("campaign_id", campaignIds);
          if (errWithEmail) throw errWithEmail;
          contestantRows = withEmail;
        } else {
          if (errWithCert) throw errWithCert;
          contestantRows = withCert;
        }

        const contestants = (contestantRows ?? []) as Contestant[];
        const byCampaign = new Map<string, Contestant[]>();
        for (const c of contestants) {
          const list = byCampaign.get(c.campaign_id) ?? [];
          list.push(c);
          byCampaign.set(c.campaign_id, list);
        }

        const voteTotals = await aggregateVoteTotalsByContestant(campaignIds);
        const withCounts: CategoryWithCount[] = campaigns.map((c) => {
          const list = sortContestantsByVoteTotal(byCampaign.get(c.id) ?? [], voteTotals);
          return {
            ...c,
            contestant_count: list.length,
            contestants: list,
          };
        });

        const total = contestants.length;

        const titleById = Object.fromEntries(campaigns.map((c) => [c.id, c.title]));
        let pending: Array<{ id: string; name: string; requested_at: string; campaign_title: string }> = [];
        try {
          pending = await fetchPendingCertificateRequests(campaignIds, titleById);
        } catch {
          pending = [];
        }

        if (!cancelled) {
          setCategories(withCounts);
          setTotalContestants(total);
          setCertificateRequests(pending);
        }
      } catch (e) {
        if (isMissingPortalMembersTable(e)) {
          await supabase.auth.signOut();
          router.replace("/fusion-xpress?error=setup");
          return;
        }
        if (!cancelled) {
          setError((e as Error)?.message ?? "Failed to load contestants");
          setCertificateRequests([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [authLoading, isAuthenticated, isPortalMember, hasFeature, isFullAdmin, router, user?.id]);

  const toggleVoteTotalVisibility = async (contestant: Contestant) => {
    const nextValue = !(contestant.show_vote_total ?? true);
    setTogglingVisibilityId(contestant.id);
    setError(null);
    try {
      const { error: updateErr } = await supabase
        .from("contestants")
        .update({ show_vote_total: nextValue })
        .eq("id", contestant.id);
      if (updateErr) throw updateErr;

      setCategories((prev) =>
        prev.map((cat) => ({
          ...cat,
          contestants: cat.contestants.map((c) => (c.id === contestant.id ? { ...c, show_vote_total: nextValue } : c)),
        }))
      );
    } catch (e) {
      setError((e as Error)?.message ?? "Failed to update vote total visibility.");
    } finally {
      setTogglingVisibilityId(null);
    }
  };

  const approveCertificate = async (contestantId: string) => {
    setApprovingId(contestantId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        setError("Session expired. Please sign in again.");
        return;
      }
      const res = await fetch("/api/certificate/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ contestant_id: contestantId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((data as { error?: string }).error ?? "Failed to approve certificate.");
        return;
      }
      setCategories((prev) =>
        prev.map((cat) => ({
          ...cat,
          contestants: cat.contestants.map((c) =>
            c.id === contestantId
              ? { ...c, certificate_approved_at: new Date().toISOString() }
              : c
          ),
        }))
      );
      setCertificateRequests((prev) => prev.filter((x) => x.id !== contestantId));
    } finally {
      setApprovingId(null);
    }
  };

  const deleteContestant = async (campaignId: string, contestant: Contestant) => {
    const ok = window.confirm(
      `Remove registration for "${contestant.name}"?\n\nThis cannot be undone. They will disappear from the voting page.`
    );
    if (!ok) return;

    setDeletingId(contestant.id);
    setError(null);
    try {
      const { error: delErr } = await supabase.from("contestants").delete().eq("id", contestant.id);
      if (delErr) {
        const code = String((delErr as { code?: string }).code ?? "");
        const msg = String(delErr.message ?? "");
        if (code === "23503" || msg.toLowerCase().includes("foreign key") || msg.toLowerCase().includes("violates")) {
          setError(
            "Delete blocked by a database rule (foreign key). Run database/ticketing_voting_mvp_patch_56_transactions_contestant_delete_cascade.sql in the Supabase SQL Editor, then try again."
          );
        } else {
          setError(msg || "Failed to delete contestant.");
        }
        return;
      }
      setCategories((prev) =>
        prev.map((cat) =>
          cat.id === campaignId
            ? {
                ...cat,
                contestant_count: Math.max(0, cat.contestant_count - 1),
                contestants: cat.contestants.filter((c) => c.id !== contestant.id),
              }
            : cat
        )
      );
      setTotalContestants((n) => Math.max(0, n - 1));
    } finally {
      setDeletingId(null);
    }
  };

  const downloadAllContestantsWithVotesExcel = async () => {
    setDownloadingAllVotes(true);
    setError(null);
    try {
      const campaignIds = categories.map((c) => c.id);
      if (campaignIds.length === 0) return;
      // Pull latest totals across all visible voting categories before export.
      const liveVoteTotals = await aggregateVoteTotalsByContestant(campaignIds);
      const rows = categories
        .flatMap((category) =>
          category.contestants.map((contestant) => ({
            name: contestant.name,
            category: category.title,
            votes: liveVoteTotals.get(contestant.id) ?? 0,
            email: contestant.email ?? "",
            registeredAt: new Date(contestant.created_at).toLocaleString(),
          }))
        )
        .sort((a, b) => b.votes - a.votes || a.category.localeCompare(b.category) || a.name.localeCompare(b.name));

      const headers = ["Contestant", "Category", "Votes", "Email", "Registered"];
      const csvRows = rows.map((r) => [
        r.name.replace(/"/g, '""'),
        r.category.replace(/"/g, '""'),
        String(r.votes),
        r.email.replace(/"/g, '""'),
        r.registeredAt.replace(/"/g, '""'),
      ]);
      const csv = [headers.join(","), ...csvRows.map((r) => r.map((c) => `"${c}"`).join(","))].join("\n");
      const blob = new Blob(["\uFEFF", csv], { type: "application/vnd.ms-excel;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `contestants-performance-all-categories-${new Date().toISOString().slice(0, 10)}.xls`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError((e as Error)?.message ?? "Failed to download contestants performance report.");
    } finally {
      setDownloadingAllVotes(false);
    }
  };

  if (authLoading || portalLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user || !isPortalMember || !hasFeature("voting")) return null;

  return (
    <div className="text-left">
      <div className="flex items-start justify-between gap-4 flex-col sm:flex-row">
        <div>
          <h2 className="text-xl md:text-2xl font-extrabold text-gray-900">Contestants</h2>
          <p className="text-gray-600 mt-1">
            View contestants by category and download one Excel report for all categories with live vote performance.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void downloadAllContestantsWithVotesExcel()}
          disabled={loading || categories.length === 0 || downloadingAllVotes}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-600 text-white font-semibold hover:bg-primary-700 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <Download className="w-4 h-4" />
          {downloadingAllVotes ? "Preparing Excel..." : "Download Excel (all categories)"}
        </button>
      </div>

      {error && (
        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-md text-red-700">{error}</div>
      )}

      {missingEmailColumn && (
        <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-md text-amber-900">
          <p className="font-semibold">Database update required</p>
          <p className="mt-1 text-sm">
            Run this in the Supabase SQL Editor to enable contestant email and voting link tracking (then refresh this page):
          </p>
          <p className="mt-2 text-xs font-mono bg-amber-100/80 p-2 rounded break-all">
            database/ticketing_voting_mvp_patch_34_contestants_email_voting_link.sql
          </p>
        </div>
      )}

      {missingCertificateColumns && (
        <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-md text-amber-900">
          <p className="font-semibold">Certificate feature: database update required</p>
          <p className="mt-1 text-sm">
            Run this in the Supabase SQL Editor to enable certificate approval and download tracking (then refresh):
          </p>
          <p className="mt-2 text-xs font-mono bg-amber-100/80 p-2 rounded break-all">
            database/ticketing_voting_mvp_patch_37_contestants_certificate.sql
          </p>
        </div>
      )}

      {!missingCertificateColumns && certificateRequests.length > 0 && (
        <div className="mt-6 rounded-md border border-amber-200 bg-amber-50 p-4 text-amber-900">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="font-extrabold inline-flex items-center gap-2">
                <Bell className="w-4 h-4" />
                Certificate requests pending approval
              </div>
              <p className="mt-1 text-sm">
                {certificateRequests.length} contestant{certificateRequests.length !== 1 ? "s have" : " has"} requested a participation
                certificate.
              </p>
              <p className="mt-2 text-sm">
                Latest:{" "}
                {certificateRequests
                  .slice(0, 3)
                  .map((r) => `${r.name} (${r.campaign_title})`)
                  .join(" • ")}
              </p>
              <p className="mt-2 text-sm text-amber-950/90">Expand a category below and use the certificate section to approve.</p>
            </div>
          </div>
        </div>
      )}

      <div className="mt-6 bg-white rounded-md shadow-sm border border-gray-200 p-6">
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <div className="inline-flex items-center gap-2 rounded-lg bg-primary-50 border border-primary-200 px-4 py-2">
            <UserPlus className="w-5 h-5 text-primary-700" />
            <span className="font-bold text-primary-900">Total registrations</span>
            <span className="text-2xl font-extrabold text-primary-700">{totalContestants}</span>
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-gray-500">Loading categories...</div>
        ) : categories.length === 0 ? (
          <div className="py-12 text-center text-gray-600">
            <p className="font-semibold">No voting categories yet</p>
            <p className="mt-1 text-sm">
              Create a voting campaign from{" "}
              <Link href="/dashboard/campaigns/new" className="text-primary-600 hover:underline font-medium">
                New Campaign
              </Link>{" "}
              to start receiving contestant registrations.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr className="text-left">
                  <th className="px-6 py-3 font-bold text-gray-600 w-8" />
                  <th className="px-6 py-3 font-bold text-gray-600">Category</th>
                  <th className="px-6 py-3 font-bold text-gray-600">Slug</th>
                  <th className="px-6 py-3 font-bold text-gray-600">Contestants</th>
                  <th className="px-6 py-3 font-bold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((cat) => (
                  <Fragment key={cat.id}>
                    <tr
                      className="border-b border-gray-200 hover:bg-gray-50/50"
                    >
                      <td className="px-2 py-4">
                        {cat.contestant_count > 0 && (
                          <button
                            type="button"
                            onClick={() => setExpandedCategoryId((id) => (id === cat.id ? null : cat.id))}
                            className="p-1 rounded text-gray-500 hover:bg-gray-200"
                            aria-label={expandedCategoryId === cat.id ? "Collapse" : "Expand certificates"}
                          >
                            {expandedCategoryId === cat.id ? "▼" : "▶"}
                          </button>
                        )}
                      </td>
                      <td className="px-6 py-4 font-semibold text-gray-900">{cat.title}</td>
                      <td className="px-6 py-4 text-gray-600 font-mono">{cat.slug}</td>
                      <td className="px-6 py-4 font-bold text-gray-900">{cat.contestant_count}</td>
                      <td className="px-6 py-4 flex flex-wrap gap-2">
                        <Link
                          href={`/dashboard/campaigns/${cat.id}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-medium"
                        >
                          <ExternalLink className="w-4 h-4" />
                          View
                        </Link>
                      </td>
                    </tr>
                    {expandedCategoryId === cat.id && cat.contestants.length > 0 && (
                      <tr key={`${cat.id}-cert`} className="bg-gray-50/80">
                        <td colSpan={5} className="px-6 py-4">
                          <div className="flex items-center gap-2 mb-3">
                            <FileCheck className="w-5 h-5 text-primary-600" />
                            <span className="font-semibold text-gray-800">Certificate of participation</span>
                          </div>
                          <p className="text-xs text-gray-600 mb-3">
                            Approve contestants to send their e-signed certificate by email; they can also download it from the Register as a Model page. Below: who has been approved and who has downloaded.
                          </p>
                          <table className="min-w-full text-sm border border-gray-200 rounded-lg overflow-hidden bg-white">
                            <thead className="bg-gray-100">
                              <tr className="text-left">
                                <th className="px-4 py-2 font-medium text-gray-700">Name</th>
                                <th className="px-4 py-2 font-medium text-gray-700">Email</th>
                                <th className="px-4 py-2 font-medium text-gray-700">Approved</th>
                                <th className="px-4 py-2 font-medium text-gray-700">Downloaded</th>
                                <th className="px-4 py-2 font-medium text-gray-700">Vote totals</th>
                                <th className="px-4 py-2 font-medium text-gray-700">Certificate</th>
                                <th className="px-4 py-2 font-medium text-gray-700">Remove</th>
                              </tr>
                            </thead>
                            <tbody>
                              {cat.contestants.map((c) => (
                                <tr key={c.id} className="border-t border-gray-200">
                                  <td className="px-4 py-2 font-medium text-gray-900">{c.name}</td>
                                  <td className="px-4 py-2 text-gray-600">{c.email ?? "—"}</td>
                                  <td className="px-4 py-2">
                                    {c.certificate_approved_at
                                      ? new Date(c.certificate_approved_at).toLocaleDateString()
                                      : "—"}
                                  </td>
                                  <td className="px-4 py-2">
                                    {c.certificate_downloaded_at
                                      ? new Date(c.certificate_downloaded_at).toLocaleString()
                                      : "—"}
                                  </td>
                                  <td className="px-4 py-2">
                                    {!c.certificate_approved_at ? (
                                      <button
                                        type="button"
                                        disabled={approvingId === c.id || deletingId === c.id}
                                        onClick={() => approveCertificate(c.id)}
                                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary-600 text-white text-xs font-medium hover:bg-primary-700 disabled:opacity-60"
                                      >
                                        {approvingId === c.id ? "…" : "Approve"}
                                      </button>
                                    ) : (
                                      <span className="text-green-600 text-xs font-medium">Approved</span>
                                    )}
                                  </td>
                                  <td className="px-4 py-2">
                                    <button
                                      type="button"
                                      disabled={togglingVisibilityId === c.id || approvingId === c.id || deletingId === c.id}
                                      onClick={() => void toggleVoteTotalVisibility(c)}
                                      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold transition ${c.show_vote_total ?? true ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"} disabled:opacity-60`}
                                      title={c.show_vote_total ?? true ? "Hide vote totals on the public page" : "Show vote totals on the public page"}
                                    >
                                      {(c.show_vote_total ?? true) ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                                      {togglingVisibilityId === c.id ? "…" : (c.show_vote_total ?? true) ? "Visible" : "Hidden"}
                                    </button>
                                  </td>
                                  <td className="px-4 py-2">
                                    <button
                                      type="button"
                                      disabled={deletingId === c.id || approvingId === c.id}
                                      onClick={() => deleteContestant(cat.id, c)}
                                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-red-200 bg-white text-red-700 text-xs font-medium hover:bg-red-50 disabled:opacity-60"
                                      title="Delete this registration (e.g. test data)"
                                    >
                                      <Trash2 className="w-3.5 h-3.5 shrink-0" aria-hidden />
                                      {deletingId === c.id ? "…" : "Delete"}
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
