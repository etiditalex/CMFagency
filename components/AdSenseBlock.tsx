"use client";

import { useEffect, useRef, useState } from "react";

const ADSENSE_CLIENT = "ca-pub-7231529725117325";
// Homepage_Footer_Ad slot; override with NEXT_PUBLIC_ADSENSE_SLOT if needed
const ADSENSE_SLOT = process.env.NEXT_PUBLIC_ADSENSE_SLOT || "2949826143";

export default function AdSenseBlock() {
  const insRef = useRef<HTMLModElement>(null);
  const pushed = useRef(false);
  const [showFallback, setShowFallback] = useState(false);

  useEffect(() => {
    const el = insRef.current;
    if (!el || pushed.current) return;

    let cancelled = false;
    let fallbackTimer: number | undefined;

    const tryPush = () => {
      if (cancelled || pushed.current || !el) return;
      const width = el.getBoundingClientRect().width;
      if (width < 120) return; // avoid "No slot size for availableWidth=0"

      try {
        const w = window as Window & { adsbygoogle?: unknown[] };
        (w.adsbygoogle = w.adsbygoogle || []).push({});
        pushed.current = true;

        // If ad is blocked/not filled, avoid a broken empty slot.
        fallbackTimer = window.setTimeout(() => {
          if (!cancelled && !el.querySelector("iframe")) {
            setShowFallback(true);
          }
        }, 3000);
      } catch (e) {
        setShowFallback(true);
        console.warn("AdSense push error:", e);
      }
    };

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          tryPush();
        }
      },
      { threshold: 0.1 }
    );

    const ro = new ResizeObserver(() => {
      tryPush();
    });

    io.observe(el);
    ro.observe(el);
    tryPush();

    return () => {
      cancelled = true;
      io.disconnect();
      ro.disconnect();
      if (fallbackTimer) window.clearTimeout(fallbackTimer);
    };
  }, []);

  return (
    <div className="w-full overflow-hidden rounded-lg min-h-[90px]" aria-label="Advertisement">
      {showFallback ? (
        <div className="w-full min-h-[90px] rounded-lg border border-gray-700 bg-gray-800/60 px-4 py-3 text-sm text-gray-300">
          Advertisement unavailable right now.
        </div>
      ) : (
        <ins
          ref={insRef}
          className="adsbygoogle"
          style={{ display: "block" }}
          data-ad-client={ADSENSE_CLIENT}
          data-ad-slot={ADSENSE_SLOT}
          data-ad-format="auto"
          data-full-width-responsive="true"
        />
      )}
    </div>
  );
}
