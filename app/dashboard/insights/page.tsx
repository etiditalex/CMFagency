"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BarChart3, Loader2, RefreshCw } from "lucide-react";

import { getAccessTokenForApi } from "@/lib/get-access-token-for-api";
import { useAuth } from "@/contexts/AuthContext";
import { usePortal } from "@/contexts/PortalContext";
import { DailyVoteTicketCharts, RevenuePieChart } from "@/components/dashboard/SalesInsightsCharts";

type SalesPayload = {
  generatedAt?: string;
  campaignCount?: number;
  kpis?: {
    successfulPayments: number;
    voteRevenue: number;
    ticketRevenue: number;
    merchandiseRevenue: number;
    voteUnits: number;
    paystackRevenue: number;
    mpesaRevenue: number;
  };
  pie?: { vote: number; ticket: number; merchandise: number };
  daily?: { date: string; voteRevenue: number; voteUnits: number; ticketRevenue?: number }[];
  topVoteCampaigns?: Array<{
    campaignId: string;
    title: string;
    revenue: number;
    voteUnits: number;
    successfulPayments: number;
  }>;
  error?: string;
};

export default function DashboardInsightsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { isPortalMember, loading: portalLoading, hasFeature } = usePortal();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<SalesPayload | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getAccessTokenForApi();
      if (!token) {
        setError("Session expired. Refresh the page or sign in again.");
        return;
      }
      const res = await fetch("/api/fusion-xpress/analytics/sales-overview", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const j = (await res.json().catch(() => ({}))) as SalesPayload;
      if (!res.ok) {
        setError(typeof j.error === "string" ? j.error : `Failed (${res.status})`);
        setData(null);
        return;
      }
      setData(j);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load");
      setData(null);
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
    if (!hasFeature("reports")) {
      router.replace("/dashboard");
      return;
    }
    load();
  }, [authLoading, user, isPortalMember, hasFeature, load, portalLoading, router]);

  if (authLoading || portalLoading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary-600" />
      </div>
    );
  }

  const k = data?.kpis;
  const pie = data?.pie ?? { vote: 0, ticket: 0, merchandise: 0 };
  const daily = (data?.daily ?? []).map((r) => ({
    date: r.date,
    voteRevenue: r.voteRevenue,
    voteUnits: r.voteUnits,
    ticketRevenue: r.ticketRevenue ?? 0,
  }));
  const top = data?.topVoteCampaigns ?? [];

  return (
    <div className="space-y-6 text-left">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-extrabold text-gray-900 inline-flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-primary-600" />
            Sales &amp; votes
          </h2>
          {data?.generatedAt && (
            <p className="mt-1 text-xs text-gray-500">
              Generated {new Date(data.generatedAt).toLocaleString()} · {data.campaignCount ?? 0} campaigns in scope
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-gray-200 bg-white hover:bg-gray-50 font-semibold text-gray-900 disabled:opacity-60"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
      )}

      {loading && !data ? (
        <div className="py-16 flex justify-center text-gray-500">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {[
              { label: "Successful payments", value: k?.successfulPayments ?? 0, fmt: (n: number) => n.toLocaleString() },
              { label: "Vote revenue (KES)", value: k?.voteRevenue ?? 0, fmt: (n: number) => n.toLocaleString() },
              { label: "Ticket revenue (KES)", value: k?.ticketRevenue ?? 0, fmt: (n: number) => n.toLocaleString() },
              { label: "Merch revenue (KES)", value: k?.merchandiseRevenue ?? 0, fmt: (n: number) => n.toLocaleString() },
              { label: "Vote units (qty)", value: k?.voteUnits ?? 0, fmt: (n: number) => n.toLocaleString() },
              { label: "M-Pesa / STK (KES)", value: k?.mpesaRevenue ?? 0, fmt: (n: number) => n.toLocaleString() },
              { label: "Paystack & other (KES)", value: k?.paystackRevenue ?? 0, fmt: (n: number) => n.toLocaleString() },
            ].map((card) => (
              <div
                key={card.label}
                className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
              >
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{card.label}</div>
                <div className="mt-1 text-xl md:text-2xl font-extrabold text-gray-900 tabular-nums">
                  {card.fmt(card.value)}
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="font-extrabold text-gray-900 mb-4">Revenue mix (all time)</h3>
              <RevenuePieChart vote={pie.vote} ticket={pie.ticket} merchandise={pie.merchandise} />
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="font-extrabold text-gray-900 mb-2">Daily revenue — votes &amp; tickets</h3>
              <p className="text-xs text-gray-500 mb-6">Bar and line charts across all available dates (UTC).</p>
              <DailyVoteTicketCharts rows={daily} />
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between gap-4 flex-wrap mb-4">
              <h3 className="font-extrabold text-gray-900">Top voting categories by revenue</h3>
              <Link href="/dashboard/transactions" className="text-sm font-semibold text-primary-600 hover:underline">
                View all transactions
              </Link>
            </div>
            {top.length === 0 ? (
              <p className="text-sm text-gray-500">No vote revenue in this period.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-left text-gray-600">
                      <th className="pb-2 pr-4">Category</th>
                      <th className="pb-2 pr-4 tabular-nums">Revenue (KES)</th>
                      <th className="pb-2 pr-4 tabular-nums">Vote units</th>
                      <th className="pb-2 tabular-nums">Payments</th>
                    </tr>
                  </thead>
                  <tbody>
                    {top.map((r) => (
                      <tr key={r.campaignId} className="border-b border-gray-100">
                        <td className="py-3 pr-4 font-medium text-gray-900">{r.title}</td>
                        <td className="py-3 pr-4 tabular-nums">{r.revenue.toLocaleString()}</td>
                        <td className="py-3 pr-4 tabular-nums">{r.voteUnits.toLocaleString()}</td>
                        <td className="py-3 tabular-nums">{r.successfulPayments.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
