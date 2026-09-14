"use client";

import { useEffect, useRef, useState } from "react";

type AnimatedCountProps = {
  value: number;
  suffix?: string;
  className?: string;
  durationMs?: number;
};

function easeOutCubic(t: number) {
  return 1 - (1 - t) ** 3;
}

export default function AnimatedCount({
  value,
  suffix = "",
  className,
  durationMs = 1800,
}: AnimatedCountProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(0);
  const startedRef = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) {
      setDisplay(value);
      return;
    }

    const animate = () => {
      const start = performance.now();
      const tick = (now: number) => {
        const progress = Math.min((now - start) / durationMs, 1);
        setDisplay(Math.round(easeOutCubic(progress) * value));
        if (progress < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !startedRef.current) {
          startedRef.current = true;
          animate();
          observer.disconnect();
        }
      },
      { threshold: 0.4 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [durationMs, value]);

  const label = `${value.toLocaleString()}${suffix}`;

  return (
    <span ref={ref} className={className} aria-label={label}>
      <span aria-hidden="true">
        {display.toLocaleString()}
        {suffix}
      </span>
    </span>
  );
}
