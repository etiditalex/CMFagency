"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, ExternalLink, RefreshCw, ShieldCheck } from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { usePortal } from "@/contexts/PortalContext";
import { supabase } from "@/lib/supabase";

const PATCH_FILE = "database/ticketing_voting_mvp_patch_84_fusion_voting_show_vote_totals.sql";

async function getAccessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

export default function VotingVisibilitySettingsPage() {
  const router = useRouter();
  const { isAuthenticated, user, loading: authLoading } = useAuth();
  const { isPortalMember, loading: portalLoading, hasFeature, isFullAdmin, isManager } = usePortal();

  const [showVoteTotals, setShowVoteTotals] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [migrationMissing, setMigrationMissing] = useState(false);

  const canManage = isFullAdmin || isManager;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getAccessToken();
      if (!token) {
        setError("Your session expired. Sign in again to manage vote visibility.");
        return;
      }
      const res = await fetch("/api/fusion-xpress/voting-schedule", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
        show_vote_totals?: boolean;
      };
      if (!res.ok) {
        setError(String(body?.error ?? `HTTP ${res.status}`));
        return;
      }
      setShowVoteTotals(body.show_vote_totals !== false);
    } catch (e) {
      setError((e as Error)?.message ?? "Could not load vote visibility settings.");
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
    if (!hasFeature("voting") || !canManage) {
      router.replace("/dashboard");
      return;
    }
    void load();
  }, [authLoading, portalLoading, isAuthenticated, user, isPortalMember, hasFeature, canManage, router, load]);

  const applyVisibility = useCallback(
    async (next: boolean) => {
      setSaving(true);
      setError(null);
      setMessage(null);
      setMigrationMissing(false);
      try {
        const token = await getAccessToken();
        if (!token) {
          setError("Your session expired. Sign in again to save changes.");
          return;
        }
        const res = await fetch("/api/fusion-xpress/voting-schedule", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ show_vote_totals: next }),
        });
        const body = (await res.json().catch(() => ({}))) as { error?: string; show_vote_totals?: boolean };
        if (!res.ok) {
          const msg = String(body?.error ?? `HTTP ${res.status}`);
          setError(msg);
          if (msg.toLowerCase().includes("show_vote_totals")) setMigrationMissing(true);
          return;
        }
        setShowVoteTotals(body.show_vote_totals !== false);
        setMessage(
          next
            ? "Vote totals are now visible to the public on every voting category."
            : "Vote totals are now hidden from the public on every voting category. Voting continues as normal."
        );
      } catch (e) {
        setError((e as Error)?.message ?? "Could not save vote visibility.");
      } finally {
        setSaving(false);
      }
    },
    []
  );

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

  if (!isAuthenticated || !user || !isPortalMember || !hasFeature("voting") || !canManage) return null;

  const busy = loading || saving;

  return (
    <div className="text-left">
      <div className="flex items-start justify-between gap-4 flex-col sm:flex-row">
        <div>
          <h2 className="text-xl md:text-2xl font-extrabold text-gray-900">Vote visibility</h2>
          <p className="text-gray-600 mt-1 max-w-2xl">
            Control whether the public can see vote totals for <strong>all contestants across every voting category</strong>. Turn
            this off during live voting so no one can see results or who is leading. Voting and payments keep working, and this
            dashboard always shows you the real totals.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={busy}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-gray-200 bg-white hover:bg-gray-50 text-gray-900 font-semibold disabled:opacity-60"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {error && <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-md text-red-700">{error}</div>}

      {migrationMissing && (
        <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-md text-amber-900">
          <p className="font-semibold">Database update required</p>
          <p className="mt-1 text-sm">Run this in the Supabase SQL Editor, then refresh this page:</p>
          <p className="mt-2 text-xs font-mono bg-amber-100/80 p-2 rounded break-all">{PATCH_FILE}</p>
        </div>
      )}

      <div className="mt-6 bg-white rounded-2xl shadow-[0_6px_24px_rgba(2,6,23,0.06)] border border-slate-100 p-6">
        <div className="flex items-start gap-4 flex-col sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3 min-w-0">
            <span
              className={`inline-flex w-11 h-11 rounded-full items-center justify-center flex-shrink-0 ${
                showVoteTotals ? "bg-emerald-100" : "bg-slate-200"
              }`}
            >
              {showVoteTotals ? (
                <Eye className="w-5 h-5 text-emerald-700" />
              ) : (
                <EyeOff className="w-5 h-5 text-slate-700" />
              )}
            </span>
            <div className="min-w-0">
              <div className="font-extrabold text-gray-900">Show vote totals to the public</div>
              <p className="text-sm text-gray-600 mt-1">
                {loading
                  ? "Checking current setting..."
                  : showVoteTotals
                    ? "Voters can see each contestant's vote count and who is leading."
                    : "Voters cannot see any vote counts or rankings. Contestants appear in their normal order."}
              </p>
            </div>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={showVoteTotals}
            aria-label="Show vote totals to the public"
            disabled={busy}
            onClick={() => void applyVisibility(!showVoteTotals)}
            className={`relative inline-flex h-8 w-14 flex-shrink-0 items-center rounded-full transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
              showVoteTotals ? "bg-emerald-600" : "bg-gray-300"
            }`}
          >
            <span
              className={`inline-block h-6 w-6 transform rounded-full bg-white shadow transition-transform ${
                showVoteTotals ? "translate-x-7" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="font-semibold text-gray-900 inline-flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-slate-600" />
            What changes when totals are hidden
          </div>
          <ul className="mt-2 space-y-1.5 text-sm text-gray-700 list-disc pl-5">
            <li>Vote counts disappear from every public voting category page.</li>
            <li>Contestants stop being ranked by votes and keep their normal listing order.</li>
            <li>The public vote count API returns no tallies, so results cannot be scraped.</li>
            <li>Voting, payments and receipts are unaffected — every vote is still recorded.</li>
            <li>Your dashboard reports, contestant totals and Excel exports still show real numbers.</li>
          </ul>
        </div>

        {message && (
          <p className="mt-4 text-sm font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-md p-3">
            {message}
          </p>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-4">
          <Link
            href="/voting/all"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary-700 hover:text-primary-800"
          >
            Preview public voting page
            <ExternalLink className="w-4 h-4" />
          </Link>
          <Link href="/dashboard/contestants" className="text-sm font-semibold text-gray-700 hover:text-gray-900">
            Go to Contestants
          </Link>
        </div>

        <p className="mt-4 text-xs text-gray-500">
          Public pages cache voting settings briefly, so a change can take up to a minute to appear for everyone.
        </p>
      </div>
    </div>
  );
}
