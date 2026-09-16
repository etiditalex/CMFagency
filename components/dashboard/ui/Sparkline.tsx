"use client";

import { useId } from "react";
import { ACCENT_GREEN, BRAND } from "./tokens";
import { sparklinePoints } from "./delta";

export function Sparkline({
  points,
  className = "",
}: {
  points: number[];
  className?: string;
}) {
  const series = sparklinePoints(points);
  const uid = useId().replace(/:/g, "");
  if (series.length === 0) return null;

  const W = 72;
  const H = 28;
  const max = Math.max(...series);
  const min = Math.min(...series);
  const span = Math.max(1, max - min);
  const coords = series
    .map((v, i) => {
      const x = series.length === 1 ? W / 2 : (i / (series.length - 1)) * W;
      const y = H - 2 - ((v - min) / span) * (H - 4);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className={`h-7 w-[72px] shrink-0 ${className}`}
      aria-hidden
    >
      <defs>
        <linearGradient id={`fx-spark-${uid}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={BRAND} />
          <stop offset="100%" stopColor={ACCENT_GREEN} />
        </linearGradient>
      </defs>
      <polyline
        fill="none"
        stroke={`url(#fx-spark-${uid})`}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        points={coords}
      />
    </svg>
  );
}
