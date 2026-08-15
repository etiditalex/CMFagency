"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Crown, Download, FileSpreadsheet, FileText, Loader2, Users } from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { usePortal } from "@/contexts/PortalContext";
import { supabase } from "@/lib/supabase";

type PreviewContestant = {
  id: string;
  name: string;
  email: string | null;
  votes: number;
  rank: number;
  result: string;
};

type PreviewCategory = {
  id: string;
  slug: string;
  title: string;
  totalVotes: number;
  winners: Array<{ id: string; name: string; votes: number; rank: number }>;
  contestants: PreviewContestant[];
};

type PreviewSnapshot = {
  generatedAtIso: string;
  categoryCount: number;
  contestantCount: number;
  totalVotes: number;
  categories: PreviewCategory[];
};

function filenameFromDisposition(header: string | null, fallback: string): string {
  const match = /filename="([^"]+)"/.exec(header ?? "");
  return match?.[1] ?? fallback;
}

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function DashboardContestantResultsPage() {
  const router = useRouter();
  const { isAuthenticated, user, loading: authLoading } = useAuth();
  const { isPortalMember, loading: portalLoading, hasFeature, isAdmin } = usePortal();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<PreviewSnapshot | null>(null);
  const [downloading, setDownloading] = useState<"pdf-winners" | "pdf-contestants" | "xlsx" | null>(null);

  useEffect(() => {
    if (authLoading || portalLoading) return;
    if (!isAuthenticated || !user || !isPortalMember) {
      router.replace("/fusion-xpress");
      return;
    }
    if (!hasFeature("voting") || !isAdmin) {
      router.replace("/dashboard/contestants");
      return;
    }

    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        if (!token) throw new Error("Your session expired. Sign in again.");
        const res = await fetch("/api/fusion-xpress/voting-results", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const body = (await res.json().catch(() => ({}))) as PreviewSnapshot & { error?: string };
        if (!res.ok) throw new Error(body.error ?? `Could not load results (HTTP ${res.status})`);
        if (!cancelled) setSnapshot(body);
      } catch (e) {
        if (!cancelled) setError((e as Error)?.message ?? "Failed to load results");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [authLoading, portalLoading, isAuthenticated, isPortalMember, hasFeature, isAdmin, router, user]);

  const downloadFile = async (
    key: "pdf-winners" | "pdf-contestants" | "xlsx",
    path: string,
    fallback: string
  ) => {
    setDownloading(key);
    setError(null);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("Your session expired. Sign in again.");
      const res = await fetch(path, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `Could not download (HTTP ${res.status})`);
      }
      saveBlob(await res.blob(), filenameFromDisposition(res.headers.get("Content-Disposition"), fallback));
    } catch (e) {
      setError((e as Error)?.message ?? "Failed to download");
    } finally {
      setDownloading(null);
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

  if (!isAuthenticated || !user || !isPortalMember || !hasFeature("voting") || !isAdmin) return null;

  const busy = downloading !== null;

  return (
    <div className="text-left">
      <p className="text-sm text-gray-500 mb-3">
        <Link href="/dashboard/contestants" className="text-primary-600 hover:underline font-medium">
          Contestants
        </Link>
        <span className="mx-1.5">/</span>
        Download results
      </p>
      <div className="flex items-start justify-between gap-4 flex-col sm:flex-row">
        <div>
          <h2 className="text-xl md:text-2xl font-extrabold text-gray-900">Download contestant results</h2>
          <p className="text-gray-600 mt-1 max-w-2xl">
            Official results for every voting category, with the winner listed first. Download a PDF booklet of
            winners, a full contestant PDF, or an Excel workbook with a Winners sheet and an All contestants sheet.
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() =>
            void downloadFile("xlsx", "/api/fusion-xpress/voting-results/excel?kind=all", "CFMA-2026-voting-results.xlsx")
          }
          disabled={loading || busy}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-600 text-white font-semibold hover:bg-primary-700 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {downloading === "xlsx" ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
          {downloading === "xlsx" ? "Preparing Excel..." : "Download Excel"}
        </button>
        <button
          type="button"
          onClick={() =>
            void downloadFile(
              "pdf-winners",
              "/api/fusion-xpress/voting-results/pdf?kind=winners",
              "CFMA-2026-category-winners.pdf"
            )
          }
          disabled={loading || busy}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#b8860b] text-white font-semibold hover:bg-[#9a7209] disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {downloading === "pdf-winners" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Crown className="w-4 h-4" />}
          {downloading === "pdf-winners" ? "Preparing winners PDF..." : "Download winners PDF"}
        </button>
        <button
          type="button"
          onClick={() =>
            void downloadFile(
              "pdf-contestants",
              "/api/fusion-xpress/voting-results/pdf?kind=contestants",
              "CFMA-2026-all-contestants.pdf"
            )
          }
          disabled={loading || busy}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[#b8860b] text-[#7a5a08] bg-[#faf6e8] font-semibold hover:bg-[#f3ead0] disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {downloading === "pdf-contestants" ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
          {downloading === "pdf-contestants" ? "Preparing contestants PDF..." : "Download contestants PDF"}
        </button>
      </div>

      {error && (
        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-md text-red-700">{error}</div>
      )}

      <div className="mt-6 bg-white rounded-md shadow-sm border border-gray-200 p-6">
        {loading ? (
          <div className="py-12 text-center text-gray-500">Loading ranked results...</div>
        ) : !snapshot || snapshot.categories.length === 0 ? (
          <div className="py-12 text-center text-gray-600">
            <p className="font-semibold">No voting categories yet</p>
            <p className="mt-1 text-sm">Results will appear here once vote campaigns have contestants.</p>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-3 mb-6">
              <div className="inline-flex items-center gap-2 rounded-lg bg-primary-50 border border-primary-200 px-4 py-2">
                <Users className="w-5 h-5 text-primary-700" />
                <span className="font-bold text-primary-900">Contestants</span>
                <span className="text-2xl font-extrabold text-primary-700">{snapshot.contestantCount}</span>
              </div>
              <div className="inline-flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-4 py-2">
                <Crown className="w-5 h-5 text-amber-800" />
                <span className="font-bold text-amber-950">Categories</span>
                <span className="text-2xl font-extrabold text-amber-800">{snapshot.categoryCount}</span>
              </div>
              <div className="inline-flex items-center gap-2 rounded-lg bg-gray-50 border border-gray-200 px-4 py-2">
                <Download className="w-5 h-5 text-gray-700" />
                <span className="font-bold text-gray-800">Total votes</span>
                <span className="text-2xl font-extrabold text-gray-900">
                  {snapshot.totalVotes.toLocaleString("en-KE")}
                </span>
              </div>
            </div>

            <div className="space-y-8">
              {snapshot.categories.map((cat) => (
                <section key={cat.id}>
                  <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
                    <h3 className="text-base font-extrabold text-gray-900">{cat.title}</h3>
                    <p className="text-xs text-gray-500">
                      {cat.totalVotes.toLocaleString("en-KE")} vote{cat.totalVotes === 1 ? "" : "s"}
                    </p>
                  </div>
                  {cat.contestants.length === 0 ? (
                    <p className="text-sm text-gray-500">No contestants in this category.</p>
                  ) : (
                    <div className="overflow-x-auto border border-gray-200 rounded-lg">
                      <table className="min-w-full text-sm">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr className="text-left">
                            <th className="px-4 py-2 font-bold text-gray-600 w-16">Rank</th>
                            <th className="px-4 py-2 font-bold text-gray-600">Contestant</th>
                            <th className="px-4 py-2 font-bold text-gray-600">Votes</th>
                            <th className="px-4 py-2 font-bold text-gray-600">Result</th>
                          </tr>
                        </thead>
                        <tbody>
                          {cat.contestants.map((c) => {
                            const winner = Boolean(c.result);
                            return (
                              <tr
                                key={c.id}
                                className={`border-t border-gray-200 ${winner ? "bg-[#faf6e8]" : "bg-white"}`}
                              >
                                <td className="px-4 py-2 font-bold text-gray-900">{c.rank}</td>
                                <td className={`px-4 py-2 ${winner ? "font-extrabold text-[#7a5a08]" : "font-medium text-gray-900"}`}>
                                  {c.name}
                                </td>
                                <td className="px-4 py-2 text-gray-800">{c.votes.toLocaleString("en-KE")}</td>
                                <td className="px-4 py-2">
                                  {winner ? (
                                    <span className="inline-flex items-center gap-1 text-xs font-extrabold uppercase tracking-wide text-[#7a5a08]">
                                      <Crown className="w-3.5 h-3.5" />
                                      {c.result}
                                    </span>
                                  ) : (
                                    <span className="text-gray-400">—</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
