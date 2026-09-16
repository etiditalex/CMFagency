"use client";

import { CHART } from "@/components/dashboard/ui/tokens";
import { LabeledStatList } from "@/components/dashboard/ui/LabeledStatList";

type PieProps = {
  vote: number;
  ticket: number;
  merchandise: number;
};

function pct(part: number, total: number) {
  if (total <= 0) return 0;
  return (part / total) * 100;
}

/** Revenue mix — labeled list with percentages (no unlabeled pie). */
export function RevenuePieChart({ vote, ticket, merchandise }: PieProps) {
  const total = vote + ticket + merchandise;
  if (total <= 0) {
    return <p className="text-sm font-medium text-ink-muted py-6">No successful revenue in the last 90 days.</p>;
  }

  return (
    <LabeledStatList
      items={[
        {
          label: "Votes",
          value: `KES ${vote.toLocaleString()}`,
          percent: pct(vote, total),
          color: CHART.primary,
        },
        {
          label: "Tickets",
          value: `KES ${ticket.toLocaleString()}`,
          percent: pct(ticket, total),
          color: CHART.secondary,
        },
        {
          label: "Merchandise",
          value: `KES ${merchandise.toLocaleString()}`,
          percent: pct(merchandise, total),
          color: CHART.tertiary,
        },
      ]}
    />
  );
}

export type DailyRevenueRow = {
  date: string;
  voteRevenue: number;
  voteUnits: number;
  ticketRevenue: number;
};

function dailyMaxRev(rows: DailyRevenueRow[]) {
  return Math.max(1, ...rows.flatMap((r) => [r.voteRevenue, r.ticketRevenue]));
}

/**
 * Grouped vertical bars per day: votes (brand) and tickets (accent-green), KES height.
 */
export function DailyVoteTicketBarChart({ rows }: { rows: DailyRevenueRow[] }) {
  if (rows.length === 0) {
    return <p className="text-sm font-medium text-ink-muted py-4">No daily data.</p>;
  }
  const maxRev = dailyMaxRev(rows);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-4 text-xs font-medium text-ink-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm" style={{ background: CHART.primary }} />
          Vote revenue (KES)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm" style={{ background: CHART.secondary }} />
          Ticket revenue (KES)
        </span>
        <span className="text-ink-muted">Small number under each day = vote units</span>
      </div>
      <div className="flex items-end gap-0.5 sm:gap-1 h-44 border-b border-hairline pb-1 overflow-x-auto">
        {rows.map((r) => (
          <div key={r.date} className="flex flex-col items-center gap-1 min-w-[1.75rem] flex-1">
            <div className="flex flex-1 w-full min-h-0 items-end justify-center gap-px sm:gap-0.5">
              <div
                className="w-[42%] max-w-[14px] rounded-t mx-auto transition-[height]"
                style={{
                  height: `${Math.max(2, (r.voteRevenue / maxRev) * 100)}%`,
                  background: CHART.primary,
                }}
                title={`${r.date} votes: KES ${r.voteRevenue.toLocaleString()} · ${r.voteUnits} units`}
              />
              <div
                className="w-[42%] max-w-[14px] rounded-t mx-auto transition-[height]"
                style={{
                  height: `${Math.max(2, (r.ticketRevenue / maxRev) * 100)}%`,
                  background: CHART.secondary,
                }}
                title={`${r.date} tickets: KES ${r.ticketRevenue.toLocaleString()}`}
              />
            </div>
            <span className="text-[10px] text-ink-muted leading-none text-center truncate w-full" title={r.date}>
              {r.date.slice(8)}
            </span>
            <span className="text-[9px] text-ink-muted tabular-nums leading-none">
              {r.voteUnits > 0 ? r.voteUnits : ""}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * SVG line chart: vote vs ticket daily revenue (same period).
 */
export function DailyVoteTicketLineChart({ rows }: { rows: DailyRevenueRow[] }) {
  if (rows.length === 0) {
    return null;
  }
  const W = 480;
  const H = 140;
  const pad = { t: 10, r: 12, b: 28, l: 12 };
  const plotW = W - pad.l - pad.r;
  const plotH = H - pad.t - pad.b;
  const maxRev = dailyMaxRev(rows);
  const n = rows.length;
  const xAt = (i: number) => pad.l + (n <= 1 ? plotW / 2 : (i / (n - 1)) * plotW);
  const yAt = (rev: number) => pad.t + plotH - (rev / maxRev) * plotH;

  const voteLine = rows.map((r, i) => `${xAt(i)},${yAt(r.voteRevenue)}`).join(" ");
  const ticketLine = rows.map((r, i) => `${xAt(i)},${yAt(r.ticketRevenue)}`).join(" ");

  const labelIdx = [0, Math.floor((n - 1) / 2), n - 1].filter((i, j, a) => a.indexOf(i) === j);
  const fmt = (iso: string) => {
    const [y, m, d] = iso.split("-");
    return `${m}/${d}`;
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-4 text-xs font-medium text-ink-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-4 h-0.5 rounded-full" style={{ background: CHART.primary }} />
          Votes
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-4 h-0.5 rounded-full" style={{ background: CHART.secondary }} />
          Tickets
        </span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full max-h-40 text-ink-muted"
        role="img"
        aria-label="Line chart of daily vote revenue and ticket revenue in KES"
      >
        <line x1={pad.l} y1={pad.t + plotH} x2={pad.l + plotW} y2={pad.t + plotH} stroke="currentColor" strokeWidth={1} />
        <polyline fill="none" stroke={CHART.primary} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" points={voteLine} />
        <polyline fill="none" stroke={CHART.secondary} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" points={ticketLine} />
        {rows.map((r, i) => (
          <g key={r.date}>
            <circle cx={xAt(i)} cy={yAt(r.voteRevenue)} r={2.5} fill={CHART.primary} />
            <circle cx={xAt(i)} cy={yAt(r.ticketRevenue)} r={2.5} fill={CHART.secondary} />
          </g>
        ))}
        {labelIdx.map((i) => (
          <text
            key={`lbl-${rows[i].date}`}
            x={xAt(i)}
            y={H - 6}
            textAnchor="middle"
            className="fill-ink-muted text-[10px]"
            style={{ fontSize: 10 }}
          >
            {fmt(rows[i].date)}
          </text>
        ))}
      </svg>
    </div>
  );
}

/** Bar + line visuals for daily vote & ticket revenue (14-day window from API). */
export function DailyVoteTicketCharts({ rows }: { rows: DailyRevenueRow[] }) {
  if (rows.length === 0) {
    return <p className="text-sm font-medium text-ink-muted py-2">No daily data.</p>;
  }
  const hasAny = rows.some((r) => r.voteRevenue > 0 || r.ticketRevenue > 0);
  if (!hasAny) {
    return (
      <p className="text-sm font-medium text-ink-muted py-2">
        No vote or ticket revenue in this 14-day window (UTC dates).
      </p>
    );
  }
  return (
    <div className="space-y-8">
      <div>
        <h4 className="text-sm font-bold text-ink mb-2">By day — bar chart</h4>
        <DailyVoteTicketBarChart rows={rows} />
      </div>
      <div className="pt-6 border-t border-hairline">
        <h4 className="text-sm font-bold text-ink mb-2">By day — line chart</h4>
        <DailyVoteTicketLineChart rows={rows} />
      </div>
    </div>
  );
}
