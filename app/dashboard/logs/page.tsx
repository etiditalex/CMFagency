"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Activity, Loader2, Pause, Play, RefreshCw, Trash2 } from "lucide-react";

import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { usePortal } from "@/contexts/PortalContext";

type EventTable = "transactions" | "votes" | "ticket_issues" | "campaigns";

type LogItem = {
  id: string;
  table: EventTable;
  event: "INSERT" | "UPDATE" | "DELETE";
  at: string;
  summary: string;
  raw: unknown;
};

const MAX_LOGS = 250;

function shortValue(v: unknown): string {
  if (v == null) return "—";
  if (typeof v === "string") return v.length > 80 ? `${v.slice(0, 77)}...` : v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return JSON.stringify(v);
}

function txSummary(row: any): string {
  const ref = shortValue(row?.reference);
  const status = shortValue(row?.status);
  const cur = shortValue(String(row?.currency ?? "").toUpperCase() || "—");
  const amt = Number(row?.amount ?? 0);
  return `ref=${ref} status=${status} amount=${cur} ${Number.isFinite(amt) ? amt.toLocaleString() : "0"}`;
}

function ticketIssueSummary(row: any): string {
  return `ticketId=${shortValue(row?.ticket_id)} qty=${shortValue(row?.quantity)} tx=${shortValue(row?.transaction_id)}`;
}

function voteSummary(row: any): string {
  return `contestant=${shortValue(row?.contestant_id)} votes=${shortValue(row?.votes)} tx=${shortValue(row?.transaction_id)}`;
}

function campaignSummary(row: any): string {
  return `title=${shortValue(row?.title)} type=${shortValue(row?.type)} active=${shortValue(row?.is_active)}`;
}

function makeSummary(table: EventTable, row: any): string {
  if (table === "transactions") return txSummary(row);
  if (table === "ticket_issues") return ticketIssueSummary(row);
  if (table === "votes") return voteSummary(row);
  return campaignSummary(row);
}

export default function DashboardLogsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { isPortalMember, loading: portalLoading, hasFeature, isAdmin } = usePortal();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const [logs, setLogs] = useState<LogItem[]>([]);

  const pushLog = useCallback((next: LogItem) => {
    setLogs((prev) => [next, ...prev].slice(0, MAX_LOGS));
  }, []);

  const loadInitial = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: txErr } = await supabase
        .from("transactions")
        .select("id,created_at,reference,status,currency,amount")
        .order("created_at", { ascending: false })
        .limit(60);
      if (txErr) throw txErr;
      const initial: LogItem[] = (data ?? []).map((row: any) => ({
        id: `seed-tx-${String(row.id)}`,
        table: "transactions",
        event: "UPDATE",
        at: String(row.created_at ?? new Date().toISOString()),
        summary: txSummary(row),
        raw: row,
      }));
      setLogs(initial);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load logs");
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading || portalLoading) return;
    if (!user || !isPortalMember) {
      router.replace("/fusion-xpress");
      return;
    }
    if (!isAdmin || !hasFeature("reports")) {
      router.replace("/dashboard");
      return;
    }
    void loadInitial();
  }, [authLoading, portalLoading, user, isPortalMember, isAdmin, hasFeature, router, loadInitial]);

  useEffect(() => {
    if (!user?.id || paused || !isAdmin) return;

    const handleRealtime = (table: EventTable, payload: any) => {
      const row = payload?.new ?? payload?.old ?? {};
      pushLog({
        id: `${table}-${payload?.eventType}-${payload?.commit_timestamp ?? Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        table,
        event: payload?.eventType ?? "UPDATE",
        at: String(payload?.commit_timestamp ?? new Date().toISOString()),
        summary: makeSummary(table, row),
        raw: row,
      });
    };

    const channel = supabase
      .channel(`fusion-xpress-live-logs-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "transactions" }, (p) => handleRealtime("transactions", p))
      .on("postgres_changes", { event: "*", schema: "public", table: "votes" }, (p) => handleRealtime("votes", p))
      .on("postgres_changes", { event: "*", schema: "public", table: "ticket_issues" }, (p) => handleRealtime("ticket_issues", p))
      .on("postgres_changes", { event: "*", schema: "public", table: "campaigns" }, (p) => handleRealtime("campaigns", p))
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, paused, isAdmin, pushLog]);

  const statusText = useMemo(() => (paused ? "Paused" : "Live"), [paused]);

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
          <h2 className="text-xl md:text-2xl font-extrabold text-gray-900 inline-flex items-center gap-2">
            <Activity className="w-6 h-6 text-primary-600" />
            Live system logs
          </h2>
          <p className="mt-1 text-sm text-gray-600">Real-time dashboard events for payments, votes, ticket issues, and campaigns.</p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center px-3 py-1 rounded-full border text-xs font-bold ${
              paused ? "text-amber-700 bg-amber-50 border-amber-200" : "text-emerald-700 bg-emerald-50 border-emerald-200"
            }`}
          >
            {statusText}
          </span>
          <button
            type="button"
            onClick={() => setPaused((v) => !v)}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-gray-200 bg-white hover:bg-gray-50 font-semibold text-gray-900"
          >
            {paused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
            {paused ? "Resume" : "Pause"}
          </button>
          <button
            type="button"
            onClick={() => setLogs([])}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-gray-200 bg-white hover:bg-gray-50 font-semibold text-gray-900"
          >
            <Trash2 className="w-4 h-4" />
            Clear
          </button>
          <button
            type="button"
            onClick={() => void loadInitial()}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-gray-200 bg-white hover:bg-gray-50 font-semibold text-gray-900 disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Reload
          </button>
        </div>
      </div>

      {error && <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}

      <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="max-h-[70vh] overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-gray-50 border-b border-gray-200">
              <tr className="text-left text-gray-600">
                <th className="px-4 py-3 font-bold">Time</th>
                <th className="px-4 py-3 font-bold">Table</th>
                <th className="px-4 py-3 font-bold">Event</th>
                <th className="px-4 py-3 font-bold">Summary</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-gray-500">
                    <Loader2 className="w-7 h-7 animate-spin mx-auto mb-2" />
                    Loading logs...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-gray-500">
                    No log events yet.
                  </td>
                </tr>
              ) : (
                logs.map((row) => (
                  <tr key={row.id} className="border-b border-gray-100 align-top">
                    <td className="px-4 py-3 whitespace-nowrap text-gray-700">{new Date(row.at).toLocaleString()}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="inline-flex px-2 py-0.5 rounded bg-gray-100 text-gray-700 border border-gray-200">{row.table}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap font-semibold">{row.event}</td>
                    <td className="px-4 py-3 text-gray-900">{row.summary}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

