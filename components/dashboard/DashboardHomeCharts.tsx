"use client";

type MixProps = {
  votes: number;
  tickets: number;
  merchandise: number;
};

function totalOf(n: number[]) {
  return n.reduce((sum, v) => sum + (Number.isFinite(v) && v > 0 ? v : 0), 0);
}

function pct(part: number, total: number) {
  if (total <= 0) return 0;
  return (part / total) * 100;
}

/** Solid pie from revenue streams — brand primary / secondary, no chart library. */
export function HomeRevenuePie({ votes, tickets, merchandise }: MixProps) {
  const v = Math.max(0, votes);
  const t = Math.max(0, tickets);
  const m = Math.max(0, merchandise);
  const total = totalOf([v, t, m]);

  if (total <= 0) {
    return (
      <div className="flex h-[220px] items-center justify-center text-sm text-slate-500">No revenue to chart yet.</div>
    );
  }

  const pv = pct(v, total);
  const pt = pct(t, total);
  const background = `conic-gradient(#1e58ca 0% ${pv}%, #2ca57c ${pv}% ${pv + pt}%, #82a6c7 ${pv + pt}% 100%)`;

  return (
    <div className="flex flex-col items-center">
      <div
        className="h-[148px] w-[148px] rounded-full shadow-[inset_0_0_0_1px_rgba(15,47,100,0.08)]"
        style={{ background }}
        role="img"
        aria-label={`Revenue mix: votes ${v}, tickets ${t}, merchandise ${m}`}
      />
      <ul className="mt-4 grid w-full grid-cols-1 gap-1.5 text-[12px] text-slate-600 sm:grid-cols-3">
        <li className="inline-flex items-center justify-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-[3px] bg-primary-600" />
          Votes
        </li>
        <li className="inline-flex items-center justify-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-[3px] bg-secondary-500" />
          Tickets
        </li>
        <li className="inline-flex items-center justify-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-[3px] bg-primary-400" />
          Merchandise
        </li>
      </ul>
    </div>
  );
}

/** Donut for campaign status. */
export function HomeCampaignDonut({ active, inactive }: { active: number; inactive: number }) {
  const a = Math.max(0, active);
  const i = Math.max(0, inactive);
  const total = a + i;

  if (total <= 0) {
    return (
      <div className="flex h-[220px] items-center justify-center text-sm text-slate-500">No campaigns to chart yet.</div>
    );
  }

  const pa = pct(a, total);
  const background = `conic-gradient(#1e58ca 0% ${pa}%, #d1e8ef ${pa}% 100%)`;

  return (
    <div className="flex flex-col items-center">
      <div className="relative h-[148px] w-[148px]">
        <div
          className="h-full w-full rounded-full"
          style={{ background }}
          role="img"
          aria-label={`Campaigns: ${a} active, ${i} inactive`}
        />
        <div className="absolute inset-[28px] rounded-full bg-white shadow-[0_0_0_1px_rgba(15,47,100,0.06)] flex flex-col items-center justify-center">
          <div className="text-xl font-bold tabular-nums text-slate-900">{total}</div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Total</div>
        </div>
      </div>
      <ul className="mt-4 grid w-full grid-cols-2 gap-1.5 text-[12px] text-slate-600">
        <li className="inline-flex items-center justify-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-[3px] bg-primary-600" />
          Active {a}
        </li>
        <li className="inline-flex items-center justify-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-[3px] bg-primary-200" />
          Inactive {i}
        </li>
      </ul>
    </div>
  );
}

/** Vertical bars for the three revenue streams. */
export function HomeRevenueBars({ votes, tickets, merchandise }: MixProps) {
  const rows = [
    { label: "Tickets", value: Math.max(0, tickets), fill: "bg-primary-600" },
    { label: "Votes", value: Math.max(0, votes), fill: "bg-secondary-500" },
    { label: "Merch", value: Math.max(0, merchandise), fill: "bg-primary-400" },
  ];
  const peak = Math.max(1, ...rows.map((r) => r.value));

  return (
    <div className="flex h-[220px] flex-col">
      <div className="flex min-h-0 flex-1 items-end justify-around gap-4 px-2">
        {rows.map((r) => (
          <div key={r.label} className="flex h-full w-16 flex-col items-center justify-end">
            <div className="mb-1 text-[10px] font-semibold tabular-nums text-slate-500">
              {r.value > 0 ? r.value.toLocaleString(undefined, { maximumFractionDigits: 0 }) : "—"}
            </div>
            <div
              className={`w-10 rounded-t-md ${r.fill}`}
              style={{ height: `${Math.max(r.value > 0 ? 8 : 2, (r.value / peak) * 100)}%` }}
              title={`${r.label}: ${r.value.toLocaleString()}`}
            />
            <div className="mt-2 text-[11px] font-semibold text-slate-600">{r.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DailyActivityBars({
  rows,
}: {
  rows: Array<{ date: string; voteRevenue: number; ticketRevenue: number }>;
}) {
  const visible = rows.slice(-14);
  const peak = Math.max(1, ...visible.flatMap((r) => [r.voteRevenue, r.ticketRevenue]));
  if (visible.length === 0 || !visible.some((r) => r.voteRevenue > 0 || r.ticketRevenue > 0)) {
    return null;
  }

  return (
    <div>
      <div className="flex h-40 items-end gap-1 overflow-x-auto pb-1">
        {visible.map((r) => (
          <div key={r.date} className="flex min-w-[18px] flex-1 flex-col items-center justify-end">
            <div className="flex h-32 w-full items-end justify-center gap-px">
              <div
                className="w-[45%] max-w-[10px] rounded-t bg-primary-600"
                style={{ height: `${Math.max(r.voteRevenue > 0 ? 4 : 0, (r.voteRevenue / peak) * 100)}%` }}
                title={`${r.date} votes: ${r.voteRevenue.toLocaleString()}`}
              />
              <div
                className="w-[45%] max-w-[10px] rounded-t bg-secondary-500"
                style={{ height: `${Math.max(r.ticketRevenue > 0 ? 4 : 0, (r.ticketRevenue / peak) * 100)}%` }}
                title={`${r.date} tickets: ${r.ticketRevenue.toLocaleString()}`}
              />
            </div>
            <span className="mt-1 text-[9px] text-slate-400">{r.date.slice(8)}</span>
          </div>
        ))}
      </div>
      <ul className="mt-3 flex justify-center gap-4 text-[12px] text-slate-600">
        <li className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-[3px] bg-primary-600" />
          Votes
        </li>
        <li className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-[3px] bg-secondary-500" />
          Tickets
        </li>
      </ul>
    </div>
  );
}
