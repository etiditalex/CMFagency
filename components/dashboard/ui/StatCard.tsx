import Link from "next/link";
import { Card } from "./Card";
import { DeltaChip } from "./DeltaChip";
import { Sparkline } from "./Sparkline";

export function StatCard({
  label,
  value,
  delta,
  sparkline,
  href,
  hrefLabel = "View more",
  featured = false,
  hint,
}: {
  label: string;
  value: string | number;
  delta?: number | null;
  sparkline?: number[];
  href?: string;
  hrefLabel?: string;
  featured?: boolean;
  hint?: string;
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
          <div className="mt-2 text-xs font-medium text-ink-muted">{label}</div>
          {hint ? <div className="mt-1 text-xs font-medium text-ink-muted/80">{hint}</div> : null}
          <DeltaChip value={delta} className="mt-2" />
        </div>
        {hasSpark ? <Sparkline points={sparkline!} /> : null}
      </div>
    </Card>
  );
}
