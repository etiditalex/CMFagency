"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Mail,
  Phone,
  RefreshCw,
  Star,
  Instagram,
  Radio,
} from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { usePortal } from "@/contexts/PortalContext";
import { supabase } from "@/lib/supabase";
import {
  categoryLabel,
  type ModelNomination,
  type ModelNominationStatus,
} from "@/lib/model-nominations";

const STATUS_OPTIONS: ModelNominationStatus[] = [
  "new",
  "reviewed",
  "shortlisted",
  "rejected",
];

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
  const [live, setLive] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadNominations = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    setError(null);
    try {
      const { data, error: fetchErr } = await supabase
        .from("model_nominations")
        .select(
          "id,event_slug,nominator_name,nominator_email,nominator_phone,nominee_name,nominee_email,nominee_phone,nominee_instagram,category,reason,status,source,created_at,updated_at"
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

  // Realtime + polling for live dates
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

  const filtered = nominations.filter((n) => {
    if (statusFilter !== "all" && n.status !== statusFilter) return false;
    if (categoryFilter !== "all" && n.category !== categoryFilter) return false;
    return true;
  });

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

      <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
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
            {filtered.map((n) => {
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
                          disabled={updatingId === n.id}
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
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
