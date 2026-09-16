import { CHART } from "./tokens";

export type LabeledStatItem = {
  label: string;
  value: string | number;
  percent?: number;
  color?: string;
};

const SERIES = [CHART.primary, CHART.secondary, CHART.tertiary];

export function LabeledStatList({ items, className = "" }: { items: LabeledStatItem[]; className?: string }) {
  if (items.length === 0) {
    return <p className="py-8 text-sm font-medium text-ink-muted">No data to show yet.</p>;
  }
  return (
    <ul className={`space-y-3 ${className}`}>
      {items.map((item, i) => (
        <li key={item.label} className="flex items-center justify-between gap-3">
          <span className="inline-flex min-w-0 items-center gap-2 text-sm font-medium text-ink">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-sm"
              style={{ background: item.color ?? SERIES[i] ?? CHART.primary }}
            />
            <span className="truncate">{item.label}</span>
          </span>
          <span className="shrink-0 text-sm font-bold tabular-nums text-ink">
            {item.value}
            {item.percent != null ? (
              <span className="ml-2 text-xs font-medium text-ink-muted">{Math.round(item.percent)}%</span>
            ) : null}
          </span>
        </li>
      ))}
    </ul>
  );
}
