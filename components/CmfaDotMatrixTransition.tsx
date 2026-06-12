"use client";

import { useEffect, useMemo, useState } from "react";

type Dot = { cx: number; cy: number; opacity: number; r: number };

function hash(n: number): number {
  const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

/** Dense on the right edge, thinning toward the centre. Client-only to avoid hydration drift. */
function buildDots(viewW: number, viewH: number): Dot[] {
  const rowPitch = 11;
  const colPitch = 8;
  const rows = Math.ceil(viewH / rowPitch) + 1;
  const maxCols = Math.ceil(viewW / colPitch) + 2;
  const dots: Dot[] = [];

  for (let r = 0; r < rows; r++) {
    if (hash(r * 13 + 7) < 0.025) continue;

    const y = r * rowPitch + rowPitch * 0.5;
    const rowT = r / Math.max(rows - 1, 1);

    const wave =
      Math.sin(r * 0.47) * 0.24 +
      Math.sin(r * 0.17 + 2.1) * 0.16 +
      hash(r * 19 + 5) * 0.26;
    const verticalBias = 1 - Math.abs(rowT - 0.48) * 0.18;
    const rowReach = Math.min(0.92, Math.max(0.2, (0.58 + wave) * verticalBias));

    const dotCount = Math.floor(maxCols * rowReach);
    if (dotCount < 2) continue;

    const rowOpacity = 0.65 + hash(r * 31) * 0.35;

    for (let c = 0; c < dotCount; c++) {
      const fromRight = c / Math.max(dotCount - 1, 1);

      // Right ~35% stays fully dense; only thin out further left
      if (fromRight > 0.35 && hash(r * 41 + c * 7) < (fromRight - 0.35) * 0.75) continue;

      const x = viewW - c * colPitch - colPitch * 0.5;
      if (x < 0) break;

      const densityFade = Math.pow(1 - fromRight, 1.6);
      const opacity = rowOpacity * (0.35 + densityFade * 0.65);
      const rDot = fromRight < 0.2 ? 2.4 : fromRight < 0.45 ? 2.1 : 1.7;

      if (opacity < 0.12) continue;

      dots.push({
        cx: x,
        cy: y,
        opacity: Math.round(opacity * 1000) / 1000,
        r: rDot,
      });
    }
  }

  return dots;
}

const VIEW_W = 640;
const VIEW_H = 900;

type Props = {
  className?: string;
};

export default function CmfaDotMatrixTransition({ className = "" }: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const dots = useMemo(() => (mounted ? buildDots(VIEW_W, VIEW_H) : []), [mounted]);

  if (!mounted) {
    return null;
  }

  return (
    <div
      className={`pointer-events-none absolute inset-y-0 right-0 z-[1] w-1/2 min-w-[40%] max-w-[55%] overflow-hidden ${className}`}
      aria-hidden
      style={{
        WebkitMaskImage: "linear-gradient(to left, transparent 0%, transparent 12%, black 48%)",
        maskImage: "linear-gradient(to left, transparent 0%, transparent 12%, black 48%)",
      }}
    >
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        preserveAspectRatio="xMaxYMid slice"
        className="absolute inset-0 h-full w-full"
      >
        {dots.map((d, i) => (
          <circle
            key={i}
            cx={d.cx}
            cy={d.cy}
            r={d.r}
            fill="#ffffff"
            fillOpacity={d.opacity}
          />
        ))}
      </svg>
    </div>
  );
}
