"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Activity, ExternalLink, RefreshCw } from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { usePortal } from "@/contexts/PortalContext";
import { supabase } from "@/lib/supabase";

type RealtimePayload =
  | {
      configured: true;
      fetchedAt: string;
      activeUsers: number;
      byPage: { label: string; value: number }[];
      byCountry: { label: string; value: number }[];
      byDevice: { label: string; value: number }[];
    }
  | { configured: false; message: string };

const POLL_MS = 30_000;

function BreakdownTable({
  title,
  rows,
}: {
  title: string;
  rows: { label: string; value: number }[];
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50/80 p-4">
        <h3 className="text-sm font-extrabold text-gray-900">{title}</h3>
        <p className="mt-2 text-sm text-gray-500">No breakdown data for this window.</p>
      </div>
    );
  }
  return (
    <div className="rounded-lg border border-gray-200 overflow-hidden">
      <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
        <h3 className="text-sm font-extrabold text-gray-900">{title}</h3>
      </div>
      <ul className="divide-y divide-gray-100 max-h-64 overflow-y-auto">
        {rows.map((r) => (
          <li key={r.label} className="flex items-center justify-between gap-3 px-4 py-2 text-sm">
            <span className="text-gray-800 truncate font-medium" title={r.label}>
              {r.label || "—"}
            </span>
            <span className="tabular-nums text-gray-600 shrink-0">{r.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function DashboardAnalyticsPage() {
  const router = useRouter();
  const { isAuthenticated, user, loading: authLoading } = useAuth();
  const { isPortalMember, loading: portalLoading, isAdmin } = usePortal();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<RealtimePayload | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        setError("Not signed in");
        return;
      }
      const res = await fetch("/api/fusion-xpress/analytics/realtime", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const j = (await res.json().catch(() => ({}))) as RealtimePayload & { error?: string };
      if (!res.ok) {
        setError(typeof j.error === "string" ? j.error : `Request failed (${res.status})`);
        setData(null);
        return;
      }
      if ("configured" in j && j.configured === false) {
        setData(j);
        setError(null);
        return;
      }
      setData(j as RealtimePayload);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load analytics");
      setData(null);
    } finally {
      setLoading(false);
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
    load();
  }, [authLoading, isAuthenticated, isAdmin, isPortalMember, load, portalLoading, router, user]);

  useEffect(() => {
    if (!autoRefresh || !isAdmin || authLoading || portalLoading) return;
    const t = setInterval(() => load(), POLL_MS);
    return () => clearInterval(t);
  }, [autoRefresh, authLoading, isAdmin, load, portalLoading]);

  if (authLoading || portalLoading) return null;
  if (!isAuthenticated || !user || !isPortalMember || !isAdmin) return null;

  const configured = data && "configured" in data && data.configured === true ? data : null;
  const notConfigured = data && "configured" in data && data.configured === false ? data : null;

  return (
    <div className="text-left">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-extrabold text-gray-900 flex items-center gap-2">
            <Activity className="w-7 h-7 text-primary-600" />
            Site traffic (realtime)
          </h2>
          <p className="mt-1 text-gray-600 max-w-3xl">
            Near real-time visitors from Google Analytics 4 (same data as GA → Reports → Realtime). Refreshes
            automatically every {POLL_MS / 1000} seconds.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded border-gray-300"
            />
            Auto-refresh
          </label>
          <button
            type="button"
            onClick={() => load()}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <a
            href="https://analytics.google.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-primary-200 bg-primary-50 text-sm font-semibold text-primary-800 hover:bg-primary-100"
          >
            Open GA4
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>

      <div className="mt-6 space-y-6">
        {loading && !data ? (
          <div className="py-16 text-center text-gray-500">
            <RefreshCw className="w-10 h-10 mx-auto mb-3 animate-spin text-gray-300" />
            <p>Loading realtime data…</p>
          </div>
        ) : error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-red-800 text-sm font-medium">{error}</div>
        ) : notConfigured ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-amber-950 text-sm space-y-3">
            <p className="font-extrabold">GA4 API not configured</p>
            <p>{notConfigured.message}</p>
            <ol className="list-decimal list-inside space-y-1 text-amber-900/90">
              <li>In GA4: Admin → Property settings → copy the numeric Property ID.</li>
              <li>Google Cloud: enable &quot;Google Analytics Data API&quot; for your project.</li>
              <li>Create a service account, download JSON, grant that email Viewer on the GA4 property.</li>
              <li>Set <code className="bg-amber-100/80 px-1 rounded">GA4_PROPERTY_ID</code> and{" "}
                <code className="bg-amber-100/80 px-1 rounded">GA4_SERVICE_ACCOUNT_JSON</code> in your environment (see{" "}
                <code className="bg-amber-100/80 px-1 rounded">.env.example</code>).</li>
            </ol>
          </div>
        ) : configured ? (
          <>
            <div className="rounded-xl border border-primary-200 bg-gradient-to-br from-primary-50 to-white p-6 shadow-sm">
              <p className="text-sm font-semibold text-primary-900/80">Active users (last ~30 minutes)</p>
              <p className="mt-1 text-4xl sm:text-5xl font-extrabold tabular-nums text-primary-950">
                {configured.activeUsers}
              </p>
              <p className="mt-2 text-xs text-gray-500">
                Last fetched:{" "}
                {new Date(configured.fetchedAt).toLocaleString(undefined, {
                  dateStyle: "medium",
                  timeStyle: "medium",
                })}
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <BreakdownTable title="Top pages" rows={configured.byPage} />
              <BreakdownTable title="Device category" rows={configured.byDevice} />
              <div className="md:col-span-2">
                <BreakdownTable title="Country" rows={configured.byCountry} />
              </div>
            </div>

            <p className="text-xs text-gray-500">
              Breakdown rows use GA4&apos;s realtime dimensions; counts per row are not guaranteed to sum to the total
              (GA attributes users across dimensions differently).
            </p>
          </>
        ) : null}
      </div>
    </div>
  );
}
