"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Download, Loader2, ListChecks } from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { usePortal } from "@/contexts/PortalContext";
import { supabase } from "@/lib/supabase";

type CheckInRow = {
  checked_in_at: string | null;
  reference: string;
  campaign: string;
  type: string;
  payer_name: string;
  email: string;
  amount: number;
  currency: string;
  quantity: number;
};

export default function GateCheckInsPage() {
  const router = useRouter();
  const { isAuthenticated, user, loading: authLoading } = useAuth();
  const { isPortalMember, loading: portalLoading, hasFeature } = usePortal();
  const [checkIns, setCheckIns] = useState<CheckInRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (authLoading || portalLoading) return;
    if (!isAuthenticated || !user || !isPortalMember) router.replace("/fusion-xpress");
    if (!hasFeature("reports")) router.replace("/dashboard");
  }, [authLoading, portalLoading, isAuthenticated, isPortalMember, hasFeature, router, user]);

  useEffect(() => {
    if (authLoading || portalLoading) return;
    if (!isAuthenticated || !user || !isPortalMember || !hasFeature("reports")) return;

    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (!token) throw new Error("Not logged in");
        const res = await fetch("/api/gate/check-ins", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error((j as { error?: string }).error ?? `Failed (${res.status})`);
        }
        const data = (await res.json()) as { check_ins?: CheckInRow[] };
        if (!cancelled) setCheckIns(data.check_ins ?? []);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load check-ins");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [authLoading, portalLoading, isAuthenticated, user, isPortalMember, hasFeature]);

  const handleDownload = async () => {
    setDownloading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("Not logged in");
      const res = await fetch("/api/gate/check-ins-export", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j as { error?: string }).error ?? `Download failed (${res.status})`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `gate-check-ins-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Download failed");
    } finally {
      setDownloading(false);
    }
  };

  if (authLoading || portalLoading) return null;
  if (!isAuthenticated || !user || !isPortalMember) return null;
  if (!hasFeature("reports")) return null;

  return (
    <div className="text-left max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/gate"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Gate
          </Link>
          <h2 className="text-xl md:text-2xl font-extrabold text-gray-900 flex items-center gap-2">
            <ListChecks className="w-6 h-6 text-primary-600" />
            Check-ins
          </h2>
        </div>
        <button
          type="button"
          onClick={handleDownload}
          disabled={downloading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 font-semibold text-gray-900 disabled:opacity-60"
        >
          <Download className={`w-4 h-4 ${downloading ? "animate-spin" : ""}`} />
          {downloading ? "Preparing…" : "Download CSV"}
        </button>
      </div>

      {error && (
        <div className="mt-4 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700">
          {error}
        </div>
      )}

      <div className="mt-6 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
          </div>
        ) : checkIns.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            No check-ins yet. Scan receipts at Gate to record attendance.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Check-in time</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Reference</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Campaign</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Type</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Payer name</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Email</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Amount</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Qty</th>
                </tr>
              </thead>
              <tbody>
                {checkIns.map((row, i) => (
                  <tr key={`${row.reference}-${row.checked_in_at}-${i}`} className="border-b border-gray-100 hover:bg-gray-50/50">
                    <td className="py-3 px-4 text-gray-700 whitespace-nowrap">
                      {row.checked_in_at
                        ? new Date(row.checked_in_at).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "medium" })
                        : "—"}
                    </td>
                    <td className="py-3 px-4 font-mono text-gray-800">{row.reference}</td>
                    <td className="py-3 px-4 text-gray-800">{row.campaign}</td>
                    <td className="py-3 px-4 text-gray-700">{row.type}</td>
                    <td className="py-3 px-4 text-gray-800">{row.payer_name}</td>
                    <td className="py-3 px-4 text-gray-700">{row.email}</td>
                    <td className="py-3 px-4 text-right text-gray-800">
                      {row.currency} {Number(row.amount).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right text-gray-700">{row.quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
