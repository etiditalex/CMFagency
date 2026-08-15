"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FileSpreadsheet,
  FileText,
  Mail,
  Phone,
  RefreshCw,
  Star,
  Instagram,
  Radio,
  Trash2,
  Trophy,
} from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { usePortal } from "@/contexts/PortalContext";
import { supabase } from "@/lib/supabase";
import {
  categoryLabel,
  normalizeNomineeName,
  type ModelNomination,
  type ModelNominationCategory,
  type ModelNominationStatus,
} from "@/lib/model-nominations";
import {
  buildTop10NomineesPdf,
  buildTop10NomineesXlsx,
  saveExportBytes,
  type TopNomineeExportRow,
} from "@/lib/nomination-top10-export";

const STATUS_OPTIONS: ModelNominationStatus[] = [
  "new",
  "reviewed",
  "shortlisted",
  "rejected",
];

const PAGE_SIZES = [10, 20, 50, 100] as const;

type RankedNominee = {
  key: string;
  name: string;
  count: number;
  instagram: string | null;
  email: string | null;
  phone: string | null;
};

function rankNomineesByCategory(
  nominations: ModelNomination[],
  category: ModelNominationCategory
): RankedNominee[] {
  const map = new Map<
    string,
    { name: string; count: number; instagram: string | null; email: string | null; phone: string | null }
  >();

  for (const n of nominations) {
    if (n.category !== category) continue;
    if (n.status === "rejected") continue;

    const key =
      n.nominee_name_normalized?.trim() ||
      normalizeNomineeName(n.nominee_name);
    if (!key) continue;

    const existing = map.get(key);
    if (existing) {
      existing.count += 1;
      if (!existing.instagram && n.nominee_instagram) {
        existing.instagram = n.nominee_instagram;
      }
      if (!existing.email && n.nominee_email) existing.email = n.nominee_email;
      if (!existing.phone && n.nominee_phone) existing.phone = n.nominee_phone;
      existing.name = n.nominee_name;
    } else {
      map.set(key, {
        name: n.nominee_name,
        count: 1,
        instagram: n.nominee_instagram,
        email: n.nominee_email,
        phone: n.nominee_phone,
      });
    }
  }

  return Array.from(map.entries())
    .map(([key, v]) => ({ key, ...v }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

function toExportRows(items: RankedNominee[]): TopNomineeExportRow[] {
  return items.slice(0, 10).map((item, index) => ({
    rank: index + 1,
    name: item.name,
    instagram: item.instagram,
    nominations: item.count,
    email: item.email,
    phone: item.phone,
  }));
}

function MostNominatedPanel({
  title,
  category,
  items,
  downloading,
  onDownload,
}: {
  title: string;
  category: ModelNominationCategory;
  items: RankedNominee[];
  downloading: "xlsx" | "pdf" | null;
  onDownload: (category: ModelNominationCategory, format: "xlsx" | "pdf") => void;
}) {
  const top = items.slice(0, 10);
  const max = top[0]?.count ?? 0;
  const busy = downloading !== null;

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 bg-gray-50 px-4 py-3">
        <Trophy className="w-4 h-4 text-secondary-600" aria-hidden />
        <h3 className="text-sm font-extrabold uppercase tracking-wide text-gray-900">
          {title}
        </h3>
        <span className="text-xs font-semibold text-gray-500">
          {items.length} nominee{items.length === 1 ? "" : "s"}
        </span>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onDownload(category, "xlsx")}
            disabled={top.length === 0 || busy}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-gray-200 bg-white text-xs font-semibold text-gray-800 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {downloading === "xlsx" ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <FileSpreadsheet className="w-3.5 h-3.5" />
            )}
            {downloading === "xlsx" ? "Preparing…" : "Excel"}
          </button>
          <button
            type="button"
            onClick={() => onDownload(category, "pdf")}
            disabled={top.length === 0 || busy}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-gray-200 bg-white text-xs font-semibold text-gray-800 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {downloading === "pdf" ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <FileText className="w-3.5 h-3.5" />
            )}
            {downloading === "pdf" ? "Preparing…" : "PDF"}
          </button>
        </div>
      </div>
      {top.length === 0 ? (
        <p className="px-4 py-8 text-sm text-gray-500 text-center">
          No nominations yet.
        </p>
      ) : (
        <ol className="divide-y divide-gray-100">
          {top.map((item, index) => {
            const pct = max > 0 ? Math.round((item.count / max) * 100) : 0;
            return (
              <li key={item.key} className="px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex items-start gap-3">
                    <span
                      className={`shrink-0 inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-extrabold ${
                        index === 0
                          ? "bg-secondary-100 text-secondary-800"
                          : index < 3
                            ? "bg-primary-50 text-primary-700"
                            : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {index + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="font-bold text-gray-900 truncate">
                        {item.name}
                      </p>
                      {item.instagram && (
                        <p className="mt-0.5 text-xs text-gray-500 truncate">
                          {item.instagram}
                        </p>
                      )}
                    </div>
                  </div>
                  <span className="shrink-0 text-sm font-extrabold text-primary-700">
                    {item.count}
                    <span className="ml-1 text-xs font-semibold text-gray-500">
                      {item.count === 1 ? "nom." : "noms."}
                    </span>
                  </span>
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary-500 to-secondary-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

export default function DashboardNominatePage() {
  const router = useRouter();
  const { isAuthenticated, user, loading: authLoading } = useAuth();
  const { isPortalMember, loading: portalLoading, isAdmin } = usePortal();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nominations, setNominations] = useState<ModelNomination[]>([]);
  const [statusFilter, setStatusFilter] = useState<"all" | ModelNominationStatus>("all");
  const [categoryFilter, setCategoryFilter] = useState<"all" | "top_10_male" | "top_10_female">("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [live, setLive] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZES)[number]>(10);
  const [page, setPage] = useState(0);
  const [downloadingTop, setDownloadingTop] = useState<{
    category: ModelNominationCategory;
    format: "xlsx" | "pdf";
  } | null>(null);

  const loadNominations = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    setError(null);
    try {
      const { data, error: fetchErr } = await supabase
        .from("model_nominations")
        .select(
          "id,event_slug,nominator_name,nominator_email,nominator_phone,nominee_name,nominee_name_normalized,nominee_email,nominee_phone,nominee_instagram,category,reason,status,source,device_id,created_at,updated_at"
        )
        .order("created_at", { ascending: false });

      if (fetchErr) throw fetchErr;
      setNominations((data as ModelNomination[]) ?? []);
      setLastUpdated(new Date());
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to load nominations";
      const isMissingTable =
        typeof msg === "string" &&
        (msg.includes("does not exist") || msg.includes("42P01"));
      setError(
        isMissingTable
          ? "Nominations table not set up. Run database/ticketing_voting_mvp_patch_81_model_nominations.sql in Supabase SQL Editor."
          : msg
      );
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading || portalLoading) return;
    if (!isAuthenticated || !user || !isPortalMember) {
      router.replace("/fusion-xpress");
      return;
    }
    if (!isAdmin) {
      router.replace("/dashboard");
      return;
    }
    loadNominations();
  }, [
    authLoading,
    isAuthenticated,
    isAdmin,
    isPortalMember,
    portalLoading,
    loadNominations,
    router,
    user,
  ]);

  useEffect(() => {
    if (!isAuthenticated || !isAdmin || !isPortalMember) return;

    const channel = supabase
      .channel("fusion-xpress-nominate")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "model_nominations" },
        () => {
          setLive(true);
          void loadNominations({ silent: true });
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") setLive(true);
      });

    const interval = window.setInterval(() => {
      void loadNominations({ silent: true });
    }, 5_000);

    return () => {
      window.clearInterval(interval);
      void supabase.removeChannel(channel);
      setLive(false);
    };
  }, [isAuthenticated, isAdmin, isPortalMember, loadNominations]);

  const updateStatus = async (id: string, status: ModelNominationStatus) => {
    setUpdatingId(id);
    try {
      const { error: updateErr } = await supabase
        .from("model_nominations")
        .update({ status })
        .eq("id", id);

      if (updateErr) throw updateErr;
      setNominations((prev) =>
        prev.map((n) => (n.id === id ? { ...n, status } : n))
      );
      setLastUpdated(new Date());
    } catch (e: unknown) {
      console.error("Failed to update nomination status:", e);
    } finally {
      setUpdatingId(null);
    }
  };

  const deleteNomination = async (n: ModelNomination) => {
    const ok = window.confirm(
      `Delete nomination for "${n.nominee_name}"? This cannot be undone.`
    );
    if (!ok) return;

    setDeletingId(n.id);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("Not signed in");

      const res = await fetch(`/api/nominations/${n.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Failed to delete");

      setNominations((prev) => prev.filter((row) => row.id !== n.id));
      if (expandedId === n.id) setExpandedId(null);
      setLastUpdated(new Date());
    } catch (e: unknown) {
      console.error("Failed to delete nomination:", e);
      window.alert(e instanceof Error ? e.message : "Failed to delete nomination");
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = useMemo(() => {
    return nominations.filter((n) => {
      if (statusFilter !== "all" && n.status !== statusFilter) return false;
      if (categoryFilter !== "all" && n.category !== categoryFilter) return false;
      return true;
    });
  }, [nominations, statusFilter, categoryFilter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = useMemo(
    () => filtered.slice(safePage * pageSize, safePage * pageSize + pageSize),
    [filtered, safePage, pageSize]
  );

  useEffect(() => {
    setPage(0);
  }, [statusFilter, categoryFilter, pageSize]);

  const topMale = useMemo(
    () => rankNomineesByCategory(nominations, "top_10_male"),
    [nominations]
  );
  const topFemale = useMemo(
    () => rankNomineesByCategory(nominations, "top_10_female"),
    [nominations]
  );

  const downloadTopTen = async (category: ModelNominationCategory, format: "xlsx" | "pdf") => {
    const items = category === "top_10_male" ? topMale : topFemale;
    const rows = toExportRows(items);
    if (rows.length === 0) return;
    setDownloadingTop({ category, format });
    setError(null);
    try {
      const file =
        format === "xlsx"
          ? await buildTop10NomineesXlsx(category, rows)
          : await buildTop10NomineesPdf(category, rows);
      const mime =
        format === "xlsx"
          ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          : "application/pdf";
      saveExportBytes(file.bytes, file.filename, mime);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to download top 10 list");
    } finally {
      setDownloadingTop(null);
    }
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString("en-KE", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const statusBadge = (status: ModelNominationStatus) => {
    const styles: Record<ModelNominationStatus, string> = {
      new: "bg-amber-100 text-amber-800 border-amber-200",
      reviewed: "bg-slate-100 text-slate-700 border-slate-200",
      shortlisted: "bg-green-100 text-green-800 border-green-200",
      rejected: "bg-red-100 text-red-800 border-red-200",
    };
    const labels: Record<ModelNominationStatus, string> = {
      new: "New",
      reviewed: "Reviewed",
      shortlisted: "Shortlisted",
      rejected: "Rejected",
    };
    return (
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${styles[status]}`}
      >
        {labels[status]}
      </span>
    );
  };

  if (authLoading || portalLoading) return null;
  if (!isAuthenticated || !user || !isPortalMember || !isAdmin) return null;

  const newCount = nominations.filter((n) => n.status === "new").length;

  return (
    <div className="text-left">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-extrabold text-gray-900">
            Nominate
          </h2>
          <p className="mt-1 text-gray-600 max-w-3xl">
            Live nominations from{" "}
            <a
              href="/events/nominate-model"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-600 font-semibold hover:underline"
            >
              /events/nominate-model
            </a>
            . New entries appear here in real time.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold border ${
              live
                ? "bg-green-50 text-green-700 border-green-200"
                : "bg-gray-50 text-gray-500 border-gray-200"
            }`}
          >
            <Radio className={`w-3.5 h-3.5 ${live ? "animate-pulse" : ""}`} />
            {live ? "Live" : "Connecting…"}
          </span>
          {lastUpdated && (
            <span className="text-xs text-gray-500">
              Updated {lastUpdated.toLocaleTimeString("en-KE")}
            </span>
          )}
          <button
            type="button"
            onClick={() => loadNominations()}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <select
            value={categoryFilter}
            onChange={(e) =>
              setCategoryFilter(e.target.value as typeof categoryFilter)
            }
            className="px-3 py-2 rounded-md border border-gray-300 bg-white text-sm font-medium text-gray-700"
          >
            <option value="all">All categories</option>
            <option value="top_10_male">Top 10 Male</option>
            <option value="top_10_female">Top 10 Female</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as typeof statusFilter)
            }
            className="px-3 py-2 rounded-md border border-gray-300 bg-white text-sm font-medium text-gray-700"
          >
            <option value="all">All statuses</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-3 text-sm">
        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-primary-50 text-primary-800 font-semibold">
          Total: {nominations.length}
        </span>
        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-amber-50 text-amber-800 font-semibold">
          New: {newCount}
        </span>
      </div>

      <div className="mt-6">
        <div className="mb-3 flex items-center gap-2">
          <Trophy className="w-5 h-5 text-secondary-600" aria-hidden />
          <h3 className="text-base md:text-lg font-extrabold text-gray-900">
            Most nominated so far
          </h3>
        </div>
        <p className="mb-4 text-sm text-gray-600">
          Ranked by nomination count (rejected entries excluded). Download the current
          top ten for each category as Excel or PDF.
        </p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          <MostNominatedPanel
            title="Top Male Models"
            category="top_10_male"
            items={topMale}
            downloading={downloadingTop?.category === "top_10_male" ? downloadingTop.format : null}
            onDownload={downloadTopTen}
          />
          <MostNominatedPanel
            title="Top Female Models"
            category="top_10_female"
            items={topFemale}
            downloading={downloadingTop?.category === "top_10_female" ? downloadingTop.format : null}
            onDownload={downloadTopTen}
          />
        </div>
      </div>

      <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="border-b border-gray-100 bg-gray-50 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-extrabold uppercase tracking-wide text-gray-900">
            All nominations
          </h3>
          {filtered.length > 0 && (
            <label className="inline-flex items-center gap-2 text-sm text-gray-600">
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value) as (typeof PAGE_SIZES)[number]);
                  setPage(0);
                }}
                className="rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm font-medium text-gray-800 shadow-sm"
                aria-label="Rows per page"
              >
                {PAGE_SIZES.map((n) => (
                  <option key={n} value={n}>
                    {n} rows
                  </option>
                ))}
              </select>
              <span className="text-xs text-gray-500">
                Showing{" "}
                {filtered.length === 0
                  ? 0
                  : safePage * pageSize + 1}
                –
                {Math.min((safePage + 1) * pageSize, filtered.length)} of{" "}
                {filtered.length}
              </span>
            </label>
          )}
        </div>
        {loading && nominations.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <Star className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>Loading nominations…</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <p className="text-red-600 font-medium">{error}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <Star className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No nominations yet.</p>
            <p className="mt-1 text-sm">
              Submissions from the Nominate Model page will appear here live.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {pageRows.map((n) => {
              const open = expandedId === n.id;
              return (
                <li key={n.id} className="p-4 sm:p-5 hover:bg-gray-50/80">
                  <button
                    type="button"
                    onClick={() => setExpandedId(open ? null : n.id)}
                    className="w-full text-left"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-bold text-gray-900 truncate">
                            {n.nominee_name}
                          </p>
                          {statusBadge(n.status)}
                          <span className="text-xs font-semibold text-primary-700 bg-primary-50 border border-primary-100 px-2 py-0.5 rounded">
                            {categoryLabel(n.category)}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-gray-600">
                          {n.nominator_name ? (
                            <>
                              Nominated by{" "}
                              <span className="font-medium text-gray-800">
                                {n.nominator_name}
                              </span>
                            </>
                          ) : (
                            <span className="text-gray-500">Public nomination</span>
                          )}
                        </p>
                        <p className="mt-1 text-xs text-gray-500 font-medium">
                          {formatDate(n.created_at)}
                        </p>
                      </div>
                      <span className="text-xs text-primary-600 font-semibold shrink-0">
                        {open ? "Hide" : "View details"}
                      </span>
                    </div>
                  </button>

                  {open && (
                    <div className="mt-4 pt-4 border-t border-gray-100 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        {n.nominator_name || n.nominator_email || n.nominator_phone ? (
                          <div>
                            <p className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">
                              Nominator
                            </p>
                            {n.nominator_name && (
                              <p className="font-semibold text-gray-900">
                                {n.nominator_name}
                              </p>
                            )}
                            {n.nominator_email && (
                              <a
                                href={`mailto:${n.nominator_email}`}
                                className="mt-1 inline-flex items-center gap-1.5 text-primary-600 hover:underline"
                              >
                                <Mail className="w-3.5 h-3.5" />
                                {n.nominator_email}
                              </a>
                            )}
                            {n.nominator_phone && (
                              <a
                                href={`tel:${n.nominator_phone}`}
                                className="mt-1 flex items-center gap-1.5 text-gray-700"
                              >
                                <Phone className="w-3.5 h-3.5" />
                                {n.nominator_phone}
                              </a>
                            )}
                          </div>
                        ) : null}
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">
                            Nominee
                          </p>
                          <p className="font-semibold text-gray-900">
                            {n.nominee_name}
                          </p>
                          {n.nominee_email && (
                            <a
                              href={`mailto:${n.nominee_email}`}
                              className="mt-1 inline-flex items-center gap-1.5 text-primary-600 hover:underline"
                            >
                              <Mail className="w-3.5 h-3.5" />
                              {n.nominee_email}
                            </a>
                          )}
                          {n.nominee_phone && (
                            <a
                              href={`tel:${n.nominee_phone}`}
                              className="mt-1 flex items-center gap-1.5 text-gray-700"
                            >
                              <Phone className="w-3.5 h-3.5" />
                              {n.nominee_phone}
                            </a>
                          )}
                          {n.nominee_instagram && (
                            <p className="mt-1 flex items-center gap-1.5 text-gray-700">
                              <Instagram className="w-3.5 h-3.5" />
                              {n.nominee_instagram}
                            </p>
                          )}
                        </div>
                      </div>

                      <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">
                          Reason
                        </p>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                          {n.reason}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <label className="text-xs font-bold uppercase tracking-wide text-gray-500">
                          Status
                        </label>
                        <select
                          value={n.status}
                          disabled={updatingId === n.id || deletingId === n.id}
                          onChange={(e) =>
                            updateStatus(
                              n.id,
                              e.target.value as ModelNominationStatus
                            )
                          }
                          className="px-3 py-1.5 rounded-md border border-gray-300 bg-white text-sm font-medium text-gray-700 disabled:opacity-60"
                        >
                          {STATUS_OPTIONS.map((s) => (
                            <option key={s} value={s}>
                              {s.charAt(0).toUpperCase() + s.slice(1)}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => deleteNomination(n)}
                          disabled={deletingId === n.id || updatingId === n.id}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-red-200 bg-red-50 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          {deletingId === n.id ? "Deleting…" : "Delete"}
                        </button>
                      </div>
                      {n.device_id && (
                        <p className="text-xs text-gray-400 break-all">
                          Device: {n.device_id.slice(0, 8)}…
                        </p>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {filtered.length > pageSize ? (
          <div className="px-4 py-3 flex items-center justify-between border-t border-gray-100 text-sm text-gray-600">
            <button
              type="button"
              disabled={safePage <= 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              className="rounded-md border border-gray-300 px-3 py-1.5 disabled:opacity-40 hover:bg-gray-50"
            >
              Previous
            </button>
            <span>
              Page {safePage + 1} of {pageCount}
            </span>
            <button
              type="button"
              disabled={safePage >= pageCount - 1}
              onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
              className="rounded-md border border-gray-300 px-3 py-1.5 disabled:opacity-40 hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
