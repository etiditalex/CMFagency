"use client";

type PieProps = {
  vote: number;
  ticket: number;
  merchandise: number;
};

/** Revenue mix — CSS conic-gradient (no chart library). */
export function RevenuePieChart({ vote, ticket, merchandise }: PieProps) {
  const total = vote + ticket + merchandise;
  if (total <= 0) {
    return <p className="text-sm text-gray-500 py-6 text-center">No successful revenue in the last 90 days.</p>;
  }
  const pv = (vote / total) * 100;
  const pt = (ticket / total) * 100;
  const pm = (merchandise / total) * 100;
  const g = `conic-gradient(
    rgb(37 99 235) 0% ${pv}%,
    rgb(22 163 74) ${pv}% ${pv + pt}%,
    rgb(245 158 11) ${pv + pt}% 100%
  )`;

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6">
      <div
        className="w-40 h-40 rounded-full border border-gray-200 shadow-inner shrink-0"
        style={{ background: g }}
        role="img"
        aria-label={`Revenue mix: votes ${vote}, tickets ${ticket}, merchandise ${merchandise} KES`}
      />
      <ul className="text-sm space-y-2">
        <li className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-sm bg-blue-600 shrink-0" />
          <span className="text-gray-800">Votes</span>
          <span className="font-semibold tabular-nums ml-auto">KES {vote.toLocaleString()}</span>
          <span className="text-gray-500 text-xs">({pv.toFixed(0)}%)</span>
        </li>
        <li className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-sm bg-green-600 shrink-0" />
          <span className="text-gray-800">Tickets</span>
          <span className="font-semibold tabular-nums ml-auto">KES {ticket.toLocaleString()}</span>
          <span className="text-gray-500 text-xs">({pt.toFixed(0)}%)</span>
        </li>
        <li className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-sm bg-amber-500 shrink-0" />
          <span className="text-gray-800">Merchandise</span>
          <span className="font-semibold tabular-nums ml-auto">KES {merchandise.toLocaleString()}</span>
          <span className="text-gray-500 text-xs">({pm.toFixed(0)}%)</span>
        </li>
      </ul>
    </div>
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
 * Grouped vertical bars per day: votes (blue) and tickets (green), KES height.
 */
export function DailyVoteTicketBarChart({ rows }: { rows: DailyRevenueRow[] }) {
  if (rows.length === 0) {
    return <p className="text-sm text-gray-500 py-4">No daily data.</p>;
  }
  const maxRev = dailyMaxRev(rows);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-4 text-xs text-gray-600">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-blue-600" />
          Vote revenue (KES)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-emerald-600" />
          Ticket revenue (KES)
        </span>
        <span className="text-gray-500">Small number under each day = vote units</span>
      </div>
      <div className="flex items-end gap-0.5 sm:gap-1 h-44 border-b border-gray-200 pb-1 overflow-x-auto">
        {rows.map((r) => (
          <div key={r.date} className="flex flex-col items-center gap-1 min-w-[1.75rem] flex-1">
            <div className="flex flex-1 w-full min-h-0 items-end justify-center gap-px sm:gap-0.5">
              <div
                className="w-[42%] max-w-[14px] rounded-t bg-blue-600/90 mx-auto transition-[height]"
                style={{ height: `${Math.max(2, (r.voteRevenue / maxRev) * 100)}%` }}
                title={`${r.date} votes: KES ${r.voteRevenue.toLocaleString()} · ${r.voteUnits} units`}
              />
              <div
                className="w-[42%] max-w-[14px] rounded-t bg-emerald-600/90 mx-auto transition-[height]"
                style={{ height: `${Math.max(2, (r.ticketRevenue / maxRev) * 100)}%` }}
                title={`${r.date} tickets: KES ${r.ticketRevenue.toLocaleString()}`}
              />
            </div>
            <span className="text-[10px] text-gray-500 leading-none text-center truncate w-full" title={r.date}>
              {r.date.slice(8)}
            </span>
            <span className="text-[9px] text-gray-400 tabular-nums leading-none">
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
      <div className="flex flex-wrap gap-4 text-xs text-gray-600">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-4 h-0.5 bg-blue-600 rounded-full" />
          Votes
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-4 h-0.5 bg-emerald-600 rounded-full" />
          Tickets
        </span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full max-h-40 text-gray-400"
        role="img"
        aria-label="Line chart of daily vote revenue and ticket revenue in KES"
      >
        <line x1={pad.l} y1={pad.t + plotH} x2={pad.l + plotW} y2={pad.t + plotH} stroke="currentColor" strokeWidth={1} />
        <polyline fill="none" stroke="rgb(37 99 235)" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" points={voteLine} />
        <polyline fill="none" stroke="rgb(22 163 74)" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" points={ticketLine} />
        {rows.map((r, i) => (
          <g key={r.date}>
            <circle cx={xAt(i)} cy={yAt(r.voteRevenue)} r={2.5} fill="rgb(37 99 235)" />
            <circle cx={xAt(i)} cy={yAt(r.ticketRevenue)} r={2.5} fill="rgb(22 163 74)" />
          </g>
        ))}
        {labelIdx.map((i) => (
          <text
            key={`lbl-${rows[i].date}`}
            x={xAt(i)}
            y={H - 6}
            textAnchor="middle"
            className="fill-gray-500 text-[10px]"
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
    return <p className="text-sm text-gray-500 py-2">No daily data.</p>;
  }
  const hasAny = rows.some((r) => r.voteRevenue > 0 || r.ticketRevenue > 0);
  if (!hasAny) {
    return (
      <p className="text-sm text-gray-500 py-2">
        No vote or ticket revenue in this 14-day window (UTC dates).
      </p>
    );
  }
  return (
    <div className="space-y-8">
      <div>
        <h4 className="text-sm font-bold text-gray-800 mb-2">By day — bar chart</h4>
        <DailyVoteTicketBarChart rows={rows} />
      </div>
      <div className="pt-6 border-t border-gray-100">
        <h4 className="text-sm font-bold text-gray-800 mb-2">By day — line chart</h4>
        <DailyVoteTicketLineChart rows={rows} />
      </div>
    </div>
  );
}
