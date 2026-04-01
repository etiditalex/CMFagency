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

type DailyRow = { date: string; voteRevenue: number; voteUnits: number };

/** Last N days vote revenue + units (dual bar height uses revenue). */
export function VoteTrendBars({ rows }: { rows: DailyRow[] }) {
  const maxRev = Math.max(1, ...rows.map((r) => r.voteRevenue));

  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-500">
        Each day: <span className="font-medium text-blue-700">taller bar = vote revenue (KES)</span>, number = vote
        units (paid checkouts).
      </p>
      <div className="flex items-end gap-0.5 sm:gap-1 h-44 border-b border-gray-200 pb-1 overflow-x-auto">
        {rows.map((r) => (
          <div key={r.date} className="flex flex-col items-center gap-1 min-w-[1.25rem] flex-1">
            <div className="flex flex-col justify-end items-center gap-0.5 w-full flex-1 min-h-0">
              <div
                className="w-full max-w-[20px] rounded-t bg-blue-600/90 mx-auto transition-[height]"
                style={{ height: `${Math.max(2, (r.voteRevenue / maxRev) * 100)}%` }}
                title={`${r.date}: KES ${r.voteRevenue.toLocaleString()}`}
              />
            </div>
            <span
              className="text-[10px] text-gray-500 leading-none text-center truncate w-full"
              title={`${r.date} · ${r.voteUnits} units`}
            >
              {r.date.slice(8)}
            </span>
            <span className="text-[9px] text-gray-400 tabular-nums">{r.voteUnits > 0 ? r.voteUnits : ""}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
