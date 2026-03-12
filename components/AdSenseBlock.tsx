"use client";

import { useEffect, useRef } from "react";

const ADSENSE_CLIENT = "ca-pub-7231529725117325";
const ADSENSE_SLOT = process.env.NEXT_PUBLIC_ADSENSE_SLOT || "";

export default function AdSenseBlock() {
  const insRef = useRef<HTMLModElement>(null);
  const pushed = useRef(false);

  useEffect(() => {
    if (!insRef.current || pushed.current) return;
    try {
      const w = window as Window & { adsbygoogle?: unknown[] };
      (w.adsbygoogle = w.adsbygoogle || []).push({});
      pushed.current = true;
    } catch (e) {
      console.warn("AdSense push error:", e);
    }
  }, []);

  return (
    <div className="w-full overflow-hidden rounded-lg" aria-label="Advertisement">
      <ins
        ref={insRef}
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={ADSENSE_CLIENT}
        data-ad-slot={ADSENSE_SLOT || undefined}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}
