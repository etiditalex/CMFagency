"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BarChart3, Loader2, RefreshCw } from "lucide-react";

import { getAccessTokenForApi } from "@/lib/get-access-token-for-api";
import { useAuth } from "@/contexts/AuthContext";
import { usePortal } from "@/contexts/PortalContext";
import { DailyVoteTicketCharts, RevenuePieChart } from "@/components/dashboard/SalesInsightsCharts";
import { Card, CompositeMetricCard, StatCard, periodDelta } from "@/components/dashboard/ui";

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
          <h2 className="text-xl md:text-2xl font-bold text-[#1a2332] inline-flex items-center gap-2 pb-3 border-b border-hairline">
            <BarChart3 className="w-6 h-6 text-primary-600" />
            Sales &amp; votes
          </h2>
          <p className="mt-1 text-xs text-gray-500">Scope: all campaigns visible to your account.</p>
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
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <CompositeMetricCard
              title="Revenue"
              value={`KES ${((k?.voteRevenue ?? 0) + (k?.ticketRevenue ?? 0) + (k?.merchandiseRevenue ?? 0)).toLocaleString()}`}
              delta={periodDelta(daily.map((r) => r.voteRevenue + r.ticketRevenue))}
              sparkline={daily.map((r) => r.voteRevenue + r.ticketRevenue)}
              featured
              rows={[
                { label: "Votes", value: (k?.voteRevenue ?? 0).toLocaleString() },
                { label: "Tickets", value: (k?.ticketRevenue ?? 0).toLocaleString() },
                { label: "Merchandise", value: (k?.merchandiseRevenue ?? 0).toLocaleString() },
              ]}
            />
            <CompositeMetricCard
              title="Payments"
              value={(k?.successfulPayments ?? 0).toLocaleString()}
              featured={false}
              rows={[
                { label: "Vote units", value: (k?.voteUnits ?? 0).toLocaleString() },
                { label: "M-Pesa / STK", value: (k?.mpesaRevenue ?? 0).toLocaleString() },
                { label: "Paystack & other", value: (k?.paystackRevenue ?? 0).toLocaleString() },
              ]}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <StatCard
              label="Vote revenue"
              value={(k?.voteRevenue ?? 0).toLocaleString()}
              delta={periodDelta(daily.map((r) => r.voteRevenue))}
              sparkline={daily.map((r) => r.voteRevenue)}
            />
            <StatCard
              label="Ticket revenue"
              value={(k?.ticketRevenue ?? 0).toLocaleString()}
              delta={periodDelta(daily.map((r) => r.ticketRevenue))}
              sparkline={daily.map((r) => r.ticketRevenue)}
            />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <Card>
              <h3 className="font-bold text-ink mb-4">Revenue mix</h3>
              <RevenuePieChart vote={pie.vote} ticket={pie.ticket} merchandise={pie.merchandise} />
            </Card>
            <Card>
              <h3 className="font-bold text-ink mb-2">Daily revenue — votes &amp; tickets</h3>
              <p className="text-xs font-medium text-ink-muted mb-6">Bar and line charts across all available dates (UTC).</p>
              <DailyVoteTicketCharts rows={daily} />
            </Card>
          </div>

          <Card>
            <div className="flex items-center justify-between gap-4 flex-wrap mb-4">
              <h3 className="font-bold text-ink">Top voting categories by revenue</h3>
              <Link href="/dashboard/transactions" className="text-sm font-medium text-brand hover:text-brand-dark">
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
          </Card>
        </>
      )}
    </div>
  );
}
