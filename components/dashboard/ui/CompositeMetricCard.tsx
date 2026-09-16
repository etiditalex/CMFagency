import Link from "next/link";
import { Card } from "./Card";
import { DeltaChip } from "./DeltaChip";
import { Sparkline } from "./Sparkline";

export type CompositeMetricRow = {
  label: string;
  value: string | number;
  href?: string;
};

export function CompositeMetricCard({
  title,
  value,
  delta,
  sparkline,
  rows,
  href,
  hrefLabel = "View more",
  featured = true,
}: {
  title: string;
  value: string | number;
  delta?: number | null;
  sparkline?: number[];
  rows: CompositeMetricRow[];
  href?: string;
  hrefLabel?: string;
  featured?: boolean;
}) {
  const hasSpark = Array.isArray(sparkline) && sparkline.some((n) => Number.isFinite(n));
  return (
    <Card variant={featured ? "featured" : "default"}>
      {href ? (
        <div className="mb-3 flex justify-end">
          <Link href={href} className="text-sm font-medium text-brand hover:text-brand-dark">
            {hrefLabel}
          </Link>
        </div>
      ) : null}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[32px] leading-none font-bold tabular-nums text-ink">{value}</div>
          <div className="mt-2 text-xs font-medium text-ink-muted">{title}</div>
          <DeltaChip value={delta} className="mt-2" />
        </div>
        {hasSpark ? <Sparkline points={sparkline!} /> : null}
      </div>
      {rows.length > 0 ? (
        <ul className="mt-4 divide-y divide-hairline border-t border-hairline">
          {rows.map((row) => (
            <li key={row.label} className="flex items-center justify-between gap-3 py-3">
              <span className="text-sm font-medium text-ink-muted">{row.label}</span>
              {row.href ? (
                <Link href={row.href} className="text-sm font-bold tabular-nums text-ink hover:text-brand">
                  {row.value}
                </Link>
              ) : (
                <span className="text-sm font-bold tabular-nums text-ink">{row.value}</span>
              )}
            </li>
          ))}
        </ul>
      ) : null}
    </Card>
  );
}
