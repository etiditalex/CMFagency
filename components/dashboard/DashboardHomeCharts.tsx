"use client";

import { CHART } from "@/components/dashboard/ui/tokens";
import { LabeledStatList } from "@/components/dashboard/ui/LabeledStatList";

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

function formatAmount(n: number) {
  return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

/** Revenue mix as a labeled list (no unlabeled pie). */
export function HomeRevenuePie({ votes, tickets, merchandise }: MixProps) {
  const v = Math.max(0, votes);
  const t = Math.max(0, tickets);
  const m = Math.max(0, merchandise);
  const total = totalOf([v, t, m]);

  if (total <= 0) {
    return (
      <div className="flex h-[180px] items-center justify-center text-sm font-medium text-ink-muted">
        No revenue to chart yet.
      </div>
    );
  }

  return (
    <LabeledStatList
      items={[
        { label: "Votes", value: formatAmount(v), percent: pct(v, total), color: CHART.primary },
        { label: "Tickets", value: formatAmount(t), percent: pct(t, total), color: CHART.secondary },
        { label: "Merchandise", value: formatAmount(m), percent: pct(m, total), color: CHART.tertiary },
      ]}
    />
  );
}

/** Campaign status as a labeled list (no unlabeled donut). */
export function HomeCampaignDonut({ active, inactive }: { active: number; inactive: number }) {
  const a = Math.max(0, active);
  const i = Math.max(0, inactive);
  const total = a + i;

  if (total <= 0) {
    return (
      <div className="flex h-[180px] items-center justify-center text-sm font-medium text-ink-muted">
        No campaigns to chart yet.
      </div>
    );
  }

  return (
    <div>
      <div className="text-[32px] font-bold leading-none tabular-nums text-ink">{total.toLocaleString()}</div>
      <div className="mt-2 mb-4 text-xs font-medium text-ink-muted">Total campaigns</div>
      <LabeledStatList
        items={[
          { label: "Active", value: a.toLocaleString(), percent: pct(a, total), color: CHART.primary },
          { label: "Inactive", value: i.toLocaleString(), percent: pct(i, total), color: CHART.secondary },
        ]}
      />
    </div>
  );
}

/** Vertical bars for the three revenue streams. */
export function HomeRevenueBars({ votes, tickets, merchandise }: MixProps) {
  const rows = [
    { label: "Tickets", value: Math.max(0, tickets), fill: CHART.primary },
    { label: "Votes", value: Math.max(0, votes), fill: CHART.secondary },
    { label: "Merch", value: Math.max(0, merchandise), fill: CHART.tertiary },
  ];
  const peak = Math.max(1, ...rows.map((r) => r.value));

  return (
    <div className="flex h-[220px] flex-col">
      <div className="flex min-h-0 flex-1 items-end justify-around gap-4 px-2">
        {rows.map((r) => (
          <div key={r.label} className="flex h-full w-16 flex-col items-center justify-end">
            <div className="mb-1 text-[10px] font-medium tabular-nums text-ink-muted">
              {r.value > 0 ? formatAmount(r.value) : "—"}
            </div>
            <div
              className="w-10 rounded-t-md"
              style={{
                height: `${Math.max(r.value > 0 ? 8 : 2, (r.value / peak) * 100)}%`,
                background: r.fill,
              }}
              title={`${r.label}: ${r.value.toLocaleString()}`}
            />
            <div className="mt-2 text-[11px] font-medium text-ink">{r.label}</div>
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
                className="w-[45%] max-w-[10px] rounded-t"
                style={{
                  height: `${Math.max(r.voteRevenue > 0 ? 4 : 0, (r.voteRevenue / peak) * 100)}%`,
                  background: CHART.primary,
                }}
                title={`${r.date} votes: ${r.voteRevenue.toLocaleString()}`}
              />
              <div
                className="w-[45%] max-w-[10px] rounded-t"
                style={{
                  height: `${Math.max(r.ticketRevenue > 0 ? 4 : 0, (r.ticketRevenue / peak) * 100)}%`,
                  background: CHART.secondary,
                }}
                title={`${r.date} tickets: ${r.ticketRevenue.toLocaleString()}`}
              />
            </div>
            <span className="mt-1 text-[9px] text-ink-muted">{r.date.slice(8)}</span>
          </div>
        ))}
      </div>
      <ul className="mt-3 flex justify-center gap-4 text-[12px] font-medium text-ink-muted">
        <li className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: CHART.primary }} />
          Votes
        </li>
        <li className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: CHART.secondary }} />
          Tickets
        </li>
      </ul>
    </div>
  );
}
