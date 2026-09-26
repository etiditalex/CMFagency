import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowDown, ArrowUp } from "lucide-react";

export const METRIC_TILE_TONES = [
  "bg-brand",
  "bg-accent-green",
  "bg-negative",
  "bg-fx-warn",
  "bg-accent-teal",
  "bg-brand-dark",
  "bg-secondary-600",
  "bg-primary-700",
] as const;

export function MetricTile({
  label,
  value,
  icon: Icon,
  tone,
  href,
  delta,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  tone: string;
  href?: string;
  delta?: number | null;
}) {
  const inner = (
    <div className={`flex min-h-[96px] items-center gap-4 px-4 py-4 text-white shadow-[0_1px_2px_rgba(21,19,33,0.12)] ${tone}`}>
      <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/20">
        <Icon className="h-6 w-6" strokeWidth={1.75} />
      </span>
      <div className="min-w-0">
        <div className="flex items-center gap-1.5 text-[26px] font-bold leading-none tabular-nums">
          <span>{value}</span>
          {typeof delta === "number" && Number.isFinite(delta) && delta !== 0 ? (
            delta > 0 ? <ArrowUp className="h-4 w-4" aria-hidden /> : <ArrowDown className="h-4 w-4" aria-hidden />
          ) : null}
        </div>
        <div className="fx-tile-label mt-1.5 text-[11px] font-bold tracking-wide text-white/95">{label}</div>
      </div>
    </div>
  );

  if (!href) return inner;
  return (
    <Link href={href} className="block transition-transform duration-200 ease-out hover:-translate-y-0.5">
      {inner}
    </Link>
  );
}
