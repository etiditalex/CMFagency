"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BarChart3,
  CalendarRange,
  Check,
  Copy,
  Download,
  ExternalLink,
  LineChart,
  Pencil,
  Plus,
  Search,
  Smartphone,
  Ticket,
  Trash2,
  Vote,
} from "lucide-react";

import { StatCard, cardClassName, periodDelta } from "@/components/dashboard/ui";
import { BRAND, ACCENT_GREEN } from "@/components/dashboard/ui/tokens";
import { supabase } from "@/lib/supabase";

export type WorkspaceCampaign = {
  id: string;
  type: "ticket" | "vote";
  slug: string;
  title: string;
  currency: string;
  unit_amount: number;
  is_active: boolean;
  created_at: string;
  created_by?: string;
  image_url?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  total_amount: number;
  total_votes: number;
  successful_transactions: number;
};

type StatusFilter = "all" | "active" | "draft";
type ChartGrain = "daily" | "weekly";

type OverviewState = {
  loading: boolean;
  uniquePeople: number;
  todayCount: number;
  series: Array<{ date: string; value: number }>;
  leaders: Array<{ id: string; name: string; votes: number }>;
};

const PAGE_SIZE = 5;
const CARD = cardClassName("default", "p-5");
const CARD_FEATURED = cardClassName("featured", "p-5");

function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "—";
  try {
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: "Africa/Nairobi",
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(t));
  } catch {
    return "—";
  }
}

function formatMoney(currency: string, amount: number) {
  const cur = (currency || "KES").toUpperCase();
  return `${cur} ${Number(amount || 0).toLocaleString()}`;
}

function ymdInNairobi(iso: string) {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Africa/Nairobi",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso.slice(0, 10);
  }
}

function TrendLine({ values }: { values: number[] }) {
  if (values.length === 0 || values.every((v) => v <= 0)) {
    return <p className="py-10 text-center text-sm text-ink-muted">No activity in this period yet.</p>;
  }
  const W = 360;
  const H = 140;
  const pad = { t: 8, r: 8, b: 24, l: 8 };
  const plotW = W - pad.l - pad.r;
  const plotH = H - pad.t - pad.b;
  const max = Math.max(1, ...values);
  const n = values.length;
  const xAt = (i: number) => pad.l + (n <= 1 ? plotW / 2 : (i / (n - 1)) * plotW);
  const yAt = (v: number) => pad.t + plotH - (v / max) * plotH;
  const line = values.map((v, i) => `${xAt(i)},${yAt(v)}`).join(" ");
  const area = `${pad.l},${pad.t + plotH} ${line} ${pad.l + plotW},${pad.t + plotH}`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-36 w-full text-brand" role="img" aria-label="Activity over time">
      <defs>
        <linearGradient id="fx-tv-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={BRAND} stopOpacity="0.22" />
          <stop offset="100%" stopColor={BRAND} stopOpacity="0.02" />
        </linearGradient>
        <linearGradient id="fx-tv-stroke" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={BRAND} />
          <stop offset="100%" stopColor={ACCENT_GREEN} />
        </linearGradient>
      </defs>
      <polygon points={area} fill="url(#fx-tv-fill)" />
      <polyline fill="none" stroke="url(#fx-tv-stroke)" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" points={line} />
      {values.map((v, i) => (
        <circle key={i} cx={xAt(i)} cy={yAt(v)} r="2.4" fill={BRAND} />
      ))}
    </svg>
  );
}

function HeaderArt({ mode }: { mode: "ticket" | "vote" }) {
  const Icon = mode === "vote" ? Vote : Ticket;
  return (
    <div className="relative hidden h-[120px] w-[168px] shrink-0 lg:block" aria-hidden>
      <div className="absolute right-2 top-3 h-20 w-20 rounded-lg bg-brand-muted" />
      <div className="absolute right-10 top-8 flex h-16 w-16 items-center justify-center rounded-lg bg-brand text-white">
        <Icon className="h-8 w-8" strokeWidth={1.5} />
      </div>
      <div className="absolute bottom-2 right-16 flex h-12 w-12 items-center justify-center rounded-lg bg-surface text-brand border border-hairline">
        <Smartphone className="h-6 w-6" strokeWidth={1.5} />
      </div>
    </div>
  );
}

export default function TicketingVotingDashboard({
  mode,
  campaigns,
  origin,
  userId,
  isFullAdmin,
  canOpenTicketing,
  canOpenVoting,
  canCreate,
  canEdit,
  canReport,
  canDelete,
  deletingId,
  onCopyLink,
  onDelete,
  onAssign,
}: {
  mode: "ticket" | "vote";
  campaigns: WorkspaceCampaign[];
  origin: string;
  userId?: string;
  isFullAdmin: boolean;
  canOpenTicketing: boolean;
  canOpenVoting: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canReport: boolean;
  canDelete: boolean;
  deletingId: string | null;
  onCopyLink: (slug: string) => void;
  onDelete: (id: string, title: string) => void;
  onAssign?: (campaign: WorkspaceCampaign) => void;
}) {
  const isVote = mode === "vote";
  const createHref = `/dashboard/campaigns/new?type=${mode}`;
  const otherHref = isVote ? "/dashboard/campaigns?type=ticket" : "/dashboard/campaigns?type=vote";

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  const [chartGrain, setChartGrain] = useState<ChartGrain>("daily");
  const [overview, setOverview] = useState<OverviewState>({
    loading: false,
    uniquePeople: 0,
    todayCount: 0,
    series: [],
    leaders: [],
  });

  const kpis = useMemo(() => {
    const active = campaigns.filter((c) => c.is_active).length;
    const closed = campaigns.filter((c) => !c.is_active).length;
    const votes = campaigns.reduce((acc, c) => acc + (c.total_votes || 0), 0);
    const sales = campaigns.reduce((acc, c) => acc + (c.successful_transactions || 0), 0);
    const revenue = campaigns.reduce((acc, c) => acc + (c.total_amount || 0), 0);
    const currency = campaigns.find((c) => c.currency)?.currency || "KES";
    return { active, closed, votes, sales, revenue, currency };
  }, [campaigns]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return campaigns.filter((c) => {
      if (statusFilter === "active" && !c.is_active) return false;
      if (statusFilter === "draft" && c.is_active) return false;
      if (dateFrom) {
        const created = c.created_at.slice(0, 10);
        if (created < dateFrom) return false;
      }
      if (dateTo) {
        const created = c.created_at.slice(0, 10);
        if (created > dateTo) return false;
      }
      if (!q) return true;
      return c.title.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q);
    });
  }, [campaigns, dateFrom, dateTo, searchQuery, statusFilter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, statusFilter, dateFrom, dateTo, mode]);

  useEffect(() => {
    if (selectedId && filtered.some((c) => c.id === selectedId)) return;
    const start = (safePage - 1) * PAGE_SIZE;
    setSelectedId(filtered[start]?.id ?? filtered[0]?.id ?? null);
  }, [filtered, safePage, selectedId]);

  const selected = campaigns.find((c) => c.id === selectedId) ?? null;

  useEffect(() => {
    if (!selected) {
      setOverview({ loading: false, uniquePeople: 0, todayCount: 0, series: [], leaders: [] });
      return;
    }

    let cancelled = false;
    const load = async () => {
      setOverview((prev) => ({ ...prev, loading: true }));
      try {
        const todayYmd = ymdInNairobi(new Date().toISOString());
        const lookback = new Date();
        lookback.setDate(lookback.getDate() - 13);

        const txRes = await supabase
          .from("transactions")
          .select("quantity,email,created_at,contestant_id,status")
          .eq("campaign_id", selected.id)
          .eq("status", "success")
          .order("created_at", { ascending: true })
          .limit(2000);

        const txRows = !txRes.error ? (txRes.data ?? []) : [];
        const unique = new Set(
          txRows
            .map((r) => String((r as { email?: string | null }).email ?? "").trim().toLowerCase())
            .filter(Boolean)
        );
        const todayCount = txRows.reduce((acc, r) => {
          const created = String((r as { created_at?: string }).created_at ?? "");
          const qty = Number((r as { quantity?: number }).quantity ?? 0) || 0;
          if (created && ymdInNairobi(created) === todayYmd) return acc + qty;
          return acc;
        }, 0);

        const byDay = new Map<string, number>();
        for (let i = 0; i < 14; i++) {
          const d = new Date(lookback.getTime());
          d.setDate(d.getDate() + i);
          byDay.set(ymdInNairobi(d.toISOString()), 0);
        }
        for (const r of txRows) {
          const created = String((r as { created_at?: string }).created_at ?? "");
          if (!created) continue;
          const key = ymdInNairobi(created);
          if (!byDay.has(key)) continue;
          const qty = Number((r as { quantity?: number }).quantity ?? 0) || 0;
          byDay.set(key, (byDay.get(key) ?? 0) + qty);
        }

        let series = Array.from(byDay.entries()).map(([date, value]) => ({ date, value }));
        if (chartGrain === "weekly") {
          const weekly: Array<{ date: string; value: number }> = [];
          for (let i = 0; i < series.length; i += 7) {
            const chunk = series.slice(i, i + 7);
            weekly.push({
              date: chunk[0]?.date ?? "",
              value: chunk.reduce((acc, r) => acc + r.value, 0),
            });
          }
          series = weekly;
        }

        const leaders: Array<{ id: string; name: string; votes: number }> = [];
        if (selected.type === "vote") {
          const [conRes, voteRes] = await Promise.all([
            supabase.from("contestants").select("id,name,sort_order").eq("campaign_id", selected.id),
            supabase.from("votes").select("contestant_id,votes").eq("campaign_id", selected.id),
          ]);
          const voteMap = new Map<string, number>();
          if (!voteRes.error) {
            for (const v of voteRes.data ?? []) {
              const id = String((v as { contestant_id?: string }).contestant_id ?? "");
              const n = Number((v as { votes?: number }).votes ?? 0) || 0;
              if (!id) continue;
              voteMap.set(id, (voteMap.get(id) ?? 0) + n);
            }
          }
          if (voteMap.size === 0) {
            for (const r of txRows) {
              const id = String((r as { contestant_id?: string | null }).contestant_id ?? "");
              const qty = Number((r as { quantity?: number }).quantity ?? 0) || 0;
              if (!id) continue;
              voteMap.set(id, (voteMap.get(id) ?? 0) + qty);
            }
          }
          const contestants = !conRes.error ? (conRes.data ?? []) : [];
          leaders.push(
            ...contestants
              .map((c) => ({
                id: String((c as { id: string }).id),
                name: String((c as { name?: string }).name ?? "Contestant"),
                votes: voteMap.get(String((c as { id: string }).id)) ?? 0,
              }))
              .sort((a, b) => b.votes - a.votes)
              .slice(0, 5)
          );
        }

        if (!cancelled) {
          setOverview({
            loading: false,
            uniquePeople: unique.size,
            todayCount,
            series,
            leaders,
          });
        }
      } catch {
        if (!cancelled) {
          setOverview({ loading: false, uniquePeople: 0, todayCount: 0, series: [], leaders: [] });
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [chartGrain, selected]);

  const copy = async (slug: string) => {
    onCopyLink(slug);
    setCopiedSlug(slug);
    window.setTimeout(() => setCopiedSlug((cur) => (cur === slug ? null : cur)), 1600);
  };

  const exportCsv = () => {
    const header = isVote
      ? ["Campaign", "Slug", "Link", "Start", "End", "Votes", "Revenue", "Status"]
      : ["Campaign", "Slug", "Link", "Start", "End", "Sales", "Revenue", "Status"];
    const rows = filtered.map((c) => [
      c.title,
      c.slug,
      origin ? `${origin}/${c.slug}` : `/${c.slug}`,
      formatDate(c.starts_at || c.created_at),
      formatDate(c.ends_at),
      String(isVote ? c.total_votes : c.successful_transactions),
      formatMoney(c.currency, c.total_amount),
      c.is_active ? "Active" : "Draft",
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = isVote ? "fusion-xpress-voting.csv" : "fusion-xpress-ticketing.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const fromIdx = filtered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const toIdx = Math.min(safePage * PAGE_SIZE, filtered.length);
  const leaderMax = Math.max(1, ...overview.leaders.map((l) => l.votes));

  const kpiCards = isVote
    ? [
        {
          label: "Active voting links",
          value: kpis.active.toLocaleString(),
          hint: "Public campaigns currently live",
        },
        {
          label: "Total votes",
          value: kpis.votes.toLocaleString(),
          hint: "Across campaigns you can access",
        },
        {
          label: "Voting revenue",
          value: formatMoney(kpis.currency, kpis.revenue),
          hint: "Successful payments",
        },
        {
          label: "Draft campaigns",
          value: kpis.closed.toLocaleString(),
          hint: "Not publicly visible",
        },
      ]
    : [
        {
          label: "Active ticketing links",
          value: kpis.active.toLocaleString(),
          hint: "Public campaigns currently live",
        },
        {
          label: "Successful sales",
          value: kpis.sales.toLocaleString(),
          hint: "Paid ticket transactions",
        },
        {
          label: "Ticketing revenue",
          value: formatMoney(kpis.currency, kpis.revenue),
          hint: "Successful payments",
        },
        {
          label: "Draft campaigns",
          value: kpis.closed.toLocaleString(),
          hint: "Not publicly visible",
        },
      ];

  return (
    <div className="space-y-6 text-left">
      <section className={`${CARD_FEATURED} flex items-start justify-between gap-6`}>
        <div className="min-w-0">
          <h2 className="text-2xl font-bold tracking-tight text-ink sm:text-[28px]">
            {isVote ? "Voting" : "Ticketing"}
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-ink-muted">
            {isVote
              ? "Create, manage and monitor voting campaigns and shareable public links."
              : "Create, manage and monitor ticket campaigns and shareable public payment links."}
          </p>
          {canOpenTicketing || canOpenVoting ? (
            <div className="mt-4 inline-flex rounded-full bg-canvas p-1 ring-1 ring-hairline">
              {canOpenTicketing ? (
                <Link
                  href="/dashboard/campaigns?type=ticket"
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium ${
                    !isVote ? "bg-brand text-white" : "text-ink-muted hover:text-ink"
                  }`}
                >
                  <Ticket className="h-4 w-4" />
                  Ticketing
                </Link>
              ) : null}
              {canOpenVoting ? (
                <Link
                  href="/dashboard/campaigns?type=vote"
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium ${
                    isVote ? "bg-brand text-white" : "text-ink-muted hover:text-ink"
                  }`}
                >
                  <BarChart3 className="h-4 w-4" />
                  Voting
                </Link>
              ) : null}
            </div>
          ) : null}
        </div>
        <HeaderArt mode={mode} />
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpiCards.map((card) => (
          <StatCard
            key={card.label}
            label={card.label}
            value={card.value}
            hint={card.hint}
            sparkline={card.label.toLowerCase().includes("revenue") ? overview.series.map((s) => s.value) : undefined}
            delta={card.label.toLowerCase().includes("revenue") ? periodDelta(overview.series.map((s) => s.value)) : undefined}
          />
        ))}
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(20rem,1fr)]">
        <div className={`${CARD} p-0 overflow-hidden`}>
          <div className="flex flex-col gap-3 border-b border-hairline px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-5 text-sm font-semibold">
              {canCreate ? (
                <Link href={createHref} className="text-ink-muted hover:text-brand">
                  {isVote ? "Create voting link" : "Create ticketing link"}
                </Link>
              ) : null}
              <span className="border-b-2 border-brand pb-1 text-brand-dark">
                {isVote ? "Created voting links" : "Created ticketing links"}
              </span>
            </div>
            {canCreate ? (
              <Link
                href={createHref}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-brand px-4 py-2 text-sm font-bold text-white hover:bg-brand-dark"
              >
                <Plus className="h-4 w-4" />
                {isVote ? "Create voting link" : "Create ticketing link"}
              </Link>
            ) : null}
          </div>

          <div className="flex flex-col gap-3 border-b border-hairline px-5 py-3 lg:flex-row lg:items-center">
            <label className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by title or slug"
                className="h-10 w-full rounded-md border border-hairline bg-white pl-9 pr-3 text-sm text-ink placeholder:text-ink-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
              />
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="h-10 rounded-md border border-hairline bg-white px-3 text-sm text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
              aria-label="Filter by status"
            >
              <option value="all">Status: All</option>
              <option value="active">Active</option>
              <option value="draft">Draft</option>
            </select>
            <div className="flex items-center gap-2">
              <CalendarRange className="hidden h-4 w-4 text-ink-muted sm:block" />
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="h-10 rounded-md border border-hairline px-2 text-sm text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
                aria-label="From date"
              />
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="h-10 rounded-md border border-hairline px-2 text-sm text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
                aria-label="To date"
              />
            </div>
            <button
              type="button"
              onClick={exportCsv}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-hairline bg-white px-3 text-sm font-semibold text-ink hover:bg-canvas"
            >
              <Download className="h-4 w-4" />
              Export
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-canvas text-left text-[11px] font-bold text-ink-muted">
                <tr>
                  <th className="px-5 py-3">{isVote ? "Campaign" : "Event"}</th>
                  <th className="px-5 py-3">{isVote ? "Voting link" : "Ticketing link"}</th>
                  <th className="px-5 py-3">Start date</th>
                  <th className="px-5 py-3">End date</th>
                  <th className="px-5 py-3">{isVote ? "Votes" : "Sales"}</th>
                  <th className="px-5 py-3">Revenue</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-10 text-ink-muted">
                      {searchQuery.trim() || statusFilter !== "all" || dateFrom || dateTo
                        ? "No campaigns match these filters."
                        : isVote
                          ? "You don’t have any voting campaigns yet. Create one to start collecting votes."
                          : "You don’t have any ticketing campaigns yet. Create one to start selling tickets."}
                      {canCreate && filtered.length === 0 ? (
                        <Link href={createHref} className="mt-3 block font-semibold text-brand hover:underline">
                          {isVote ? "Create a voting campaign" : "Create a ticketing campaign"}
                        </Link>
                      ) : null}
                    </td>
                  </tr>
                ) : (
                  pageRows.map((c) => {
                    const publicPath = `/${c.slug}`;
                    const publicUrl = origin ? `${origin}${publicPath}` : publicPath;
                    const selectedRow = c.id === selectedId;
                    return (
                      <tr
                        key={c.id}
                        onClick={() => setSelectedId(c.id)}
                        className={`cursor-pointer border-b border-hairline ${
                          selectedRow ? "bg-brand-muted" : "even:bg-canvas hover:bg-canvas"
                        }`}
                      >
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3 min-w-[12rem]">
                            <span className="inline-flex h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-brand-muted ring-1 ring-black/[0.04]">
                              {c.image_url ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={c.image_url} alt="" className="h-full w-full object-cover" />
                              ) : (
                                <span className="flex h-full w-full items-center justify-center text-brand">
                                  {isVote ? <Vote className="h-4 w-4" /> : <Ticket className="h-4 w-4" />}
                                </span>
                              )}
                            </span>
                            <div className="min-w-0">
                              <div className="truncate font-semibold text-ink">{c.title}</div>
                              {isFullAdmin && c.created_by ? (
                                <div className="text-[11px] text-ink-muted">
                                  {c.created_by === userId ? "Created by you" : "Created by client"}
                                </div>
                              ) : null}
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-1.5">
                            <Link
                              href={publicPath}
                              onClick={(e) => e.stopPropagation()}
                              className="max-w-[9rem] truncate font-mono text-xs text-brand hover:underline"
                              title={publicUrl}
                            >
                              {publicUrl.replace(/^https?:\/\//, "")}
                            </Link>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                void copy(c.slug);
                              }}
                              className="rounded p-1 text-ink-muted hover:bg-white hover:text-brand"
                              title="Copy public link"
                            >
                              {copiedSlug === c.slug ? <Check className="h-3.5 w-3.5 text-secondary-600" /> : <Copy className="h-3.5 w-3.5" />}
                            </button>
                          </div>
                        </td>
                        <td className="px-5 py-3 whitespace-nowrap text-ink">{formatDate(c.starts_at || c.created_at)}</td>
                        <td className="px-5 py-3 whitespace-nowrap text-ink">{formatDate(c.ends_at)}</td>
                        <td className="px-5 py-3 font-semibold tabular-nums text-ink">
                          {(isVote ? c.total_votes : c.successful_transactions).toLocaleString()}
                        </td>
                        <td className="px-5 py-3 whitespace-nowrap font-semibold tabular-nums text-ink">
                          {formatMoney(c.currency, c.total_amount)}
                        </td>
                        <td className="px-5 py-3">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${
                              c.is_active ? "bg-secondary-50 text-secondary-800" : "bg-canvas text-ink-muted"
                            }`}
                          >
                            {c.is_active ? "Active" : "Draft"}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <Link
                              href={publicPath}
                              className="rounded p-1.5 text-ink-muted hover:bg-white hover:text-brand"
                              title="Open public link"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Link>
                            {canEdit ? (
                              <Link
                                href={`/dashboard/campaigns/${c.id}/edit`}
                                className="rounded p-1.5 text-ink-muted hover:bg-white hover:text-brand"
                                title="Edit campaign"
                              >
                                <Pencil className="h-4 w-4" />
                              </Link>
                            ) : null}
                            {canReport ? (
                              <Link
                                href={`/dashboard/campaigns/${c.id}`}
                                className="rounded p-1.5 text-ink-muted hover:bg-white hover:text-brand"
                                title="Open campaign report"
                              >
                                <LineChart className="h-4 w-4" />
                              </Link>
                            ) : null}
                            {canDelete ? (
                              <button
                                type="button"
                                onClick={() => onDelete(c.id, c.title)}
                                disabled={deletingId === c.id}
                                className="rounded p-1.5 text-ink-muted hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
                                title="Delete campaign"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 border-t border-hairline px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-ink-muted">
              Showing {fromIdx} to {toIdx} of {filtered.length} entries
            </p>
            <div className="flex flex-wrap items-center gap-1">
              {Array.from({ length: pageCount }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setPage(n)}
                  className={`h-8 min-w-8 rounded-md px-2 text-sm font-semibold ${
                    n === safePage ? "bg-brand text-white" : "text-ink-muted hover:bg-canvas"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        </div>

        <aside className={`${CARD} space-y-5`}>
          {selected ? (
            <>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate text-base font-bold text-[#1a2332]">Overview ({selected.title})</h3>
                  <div className="mt-1 inline-flex items-center gap-2 text-sm text-ink-muted">
                    <span className={`h-2 w-2 rounded-full ${selected.is_active ? "bg-secondary-500" : "bg-slate-400"}`} />
                    Status: {selected.is_active ? "Active" : "Draft"}
                  </div>
                </div>
                {canReport ? (
                  <Link
                    href={`/dashboard/campaigns/${selected.id}`}
                    className="shrink-0 rounded-md border border-hairline px-3 py-1.5 text-xs font-semibold text-ink hover:bg-canvas"
                  >
                    View details
                  </Link>
                ) : null}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-canvas p-3 border border-hairline">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
                    {isVote ? "Total votes" : "Successful sales"}
                  </div>
                  <div className="mt-1 text-lg font-bold tabular-nums text-ink">
                    {(isVote ? selected.total_votes : selected.successful_transactions).toLocaleString()}
                  </div>
                </div>
                <div className="rounded-lg bg-canvas p-3 border border-hairline">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Revenue</div>
                  <div className="mt-1 text-lg font-bold tabular-nums text-ink">
                    {formatMoney(selected.currency, selected.total_amount)}
                  </div>
                </div>
                <div className="rounded-lg bg-canvas p-3 border border-hairline">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
                    {isVote ? "Unique voters" : "Unique buyers"}
                  </div>
                  <div className="mt-1 text-lg font-bold tabular-nums text-ink">
                    {overview.loading ? "…" : overview.uniquePeople.toLocaleString()}
                  </div>
                </div>
                <div className="rounded-lg bg-canvas p-3 border border-hairline">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
                    {isVote ? "Votes today" : "Sales today"}
                  </div>
                  <div className="mt-1 text-lg font-bold tabular-nums text-ink">
                    {overview.loading ? "…" : overview.todayCount.toLocaleString()}
                  </div>
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h4 className="text-sm font-bold text-ink">{isVote ? "Votes over time" : "Sales over time"}</h4>
                  <select
                    value={chartGrain}
                    onChange={(e) => setChartGrain(e.target.value as ChartGrain)}
                    className="h-8 rounded-md border border-hairline bg-white px-2 text-xs font-semibold text-ink"
                    aria-label="Chart frequency"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                  </select>
                </div>
                <TrendLine values={overview.series.map((s) => s.value)} />
              </div>

              {isVote ? (
                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <h4 className="text-sm font-bold text-ink">Top candidates (by votes)</h4>
                    <Link href="/dashboard/contestants" className="text-xs font-semibold text-brand hover:underline">
                      View all
                    </Link>
                  </div>
                  {overview.leaders.length === 0 ? (
                    <p className="text-sm text-ink-muted">No contestants or votes recorded yet.</p>
                  ) : (
                    <ol className="space-y-3">
                      {overview.leaders.map((l, idx) => {
                        const pct = Math.round((l.votes / leaderMax) * 100);
                        return (
                          <li key={l.id}>
                            <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                              <span className="truncate font-semibold text-ink">
                                {idx + 1}. {l.name}
                              </span>
                              <span className="shrink-0 tabular-nums text-ink-muted">
                                {l.votes.toLocaleString()} · {leaderMax > 0 ? pct : 0}%
                              </span>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-canvas">
                              <div className="h-full rounded-full bg-brand" style={{ width: `${pct}%` }} />
                            </div>
                          </li>
                        );
                      })}
                    </ol>
                  )}
                </div>
              ) : (
                <div className="rounded-lg bg-canvas p-4 border border-hairline">
                  <div className="text-sm font-bold text-ink">Campaign details</div>
                  <dl className="mt-3 space-y-2 text-sm">
                    <div className="flex justify-between gap-3">
                      <dt className="text-ink-muted">Unit price</dt>
                      <dd className="font-semibold text-ink">{formatMoney(selected.currency, selected.unit_amount)}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-ink-muted">Public link</dt>
                      <dd className="truncate font-mono text-xs text-brand">/{selected.slug}</dd>
                    </div>
                  </dl>
                </div>
              )}

              {isFullAdmin && onAssign ? (
                <button
                  type="button"
                  onClick={() => onAssign(selected)}
                  className="w-full rounded-md border border-brand/30 px-3 py-2 text-sm font-semibold text-brand hover:bg-brand-muted"
                >
                  Assign to client
                </button>
              ) : null}
            </>
          ) : (
            <div className="py-10 text-center text-sm text-ink-muted">
              Select a campaign to see its overview.
              {(isVote ? canOpenTicketing : canOpenVoting) ? (
                <div className="mt-3">
                  <Link href={otherHref} className="font-semibold text-brand hover:underline">
                    Switch to {isVote ? "ticketing" : "voting"}
                  </Link>
                </div>
              ) : null}
            </div>
          )}
        </aside>
      </section>
    </div>
  );
}
