"use client";

import { useEffect, useRef, useState } from "react";

const ADSENSE_CLIENT = "ca-pub-7231529725117325";
// Display slot (e.g. homepage below hero); override with NEXT_PUBLIC_ADSENSE_SLOT if needed
const ADSENSE_SLOT = process.env.NEXT_PUBLIC_ADSENSE_SLOT || "2949826143";
const ADSENSE_READY_EVENT = "adsense:ready";

/** AdSense rejects pushes when the slot width is 0; allow normal mobile widths once laid out. */
const MIN_SLOT_WIDTH = 120;
const LAYOUT_RETRY_MS = 120;
const MAX_LAYOUT_RETRIES = 25;
const PUSH_RETRY_MS = 220;

function hasUsableAncestorLayout(node: HTMLElement | null): boolean {
  let current = node?.parentElement ?? null;
  let sawEnoughWidth = false;

  while (current && current !== document.body) {
    const style = getComputedStyle(current);
    if (style.display === "none" || style.visibility === "hidden") return false;

    const width = current.getBoundingClientRect().width;
    if (width >= MIN_SLOT_WIDTH) sawEnoughWidth = true;
    current = current.parentElement;
  }

  return sawEnoughWidth;
}

function hasUsableSlotSize(ins: HTMLModElement): boolean {
  const rect = ins.getBoundingClientRect();
  const wrap = ins.parentElement;
  const wrapW = wrap?.getBoundingClientRect().width ?? 0;
  const fromIns = rect.width;
  const width = Math.max(fromIns, wrapW);
  if (width < MIN_SLOT_WIDTH) return false;
  const style = getComputedStyle(ins);
  if (style.display === "none" || style.visibility === "hidden") return false;
  if (!ins.offsetParent && fromIns === 0 && wrapW === 0) return false;
  if (!hasUsableAncestorLayout(ins)) return false;
  return true;
}

function isAdSenseScriptReady(): boolean {
  const script = document.querySelector(`script[src*="pagead/js/adsbygoogle.js"]`) as HTMLScriptElement | null;
  return script?.dataset.adsenseLoaded === "true";
}

export default function AdSenseBlock() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const insRef = useRef<HTMLModElement>(null);
  const pushed = useRef(false);
  const [showFallback, setShowFallback] = useState(false);

  useEffect(() => {
    const el = insRef.current;
    if (!el || pushed.current) return;

    let cancelled = false;
    let fallbackTimer: number | undefined;
    let retryTimer: number | undefined;
    let retryCount = 0;

    const tryPush = () => {
      if (cancelled || pushed.current || !el) return;
      if (el.querySelector("iframe") || el.getAttribute("data-adsbygoogle-status") === "done") {
        pushed.current = true;
        return;
      }
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (cancelled || pushed.current || !el) return;
          if (!isAdSenseScriptReady()) {
            if (retryCount < MAX_LAYOUT_RETRIES) {
              retryCount += 1;
              retryTimer = window.setTimeout(tryPush, LAYOUT_RETRY_MS);
            }
            return;
          }
          if (!hasUsableSlotSize(el)) {
            if (retryCount < MAX_LAYOUT_RETRIES) {
              retryCount += 1;
              retryTimer = window.setTimeout(tryPush, LAYOUT_RETRY_MS);
            }
            return;
          }

          try {
            const w = window as Window & { adsbygoogle?: unknown[] };
            (w.adsbygoogle = w.adsbygoogle || []).push({ element: el });
            pushed.current = true;

            fallbackTimer = window.setTimeout(() => {
              if (!cancelled && !el.querySelector("iframe")) {
                setShowFallback(true);
              }
            }, 3000);
          } catch (e) {
            const message = e instanceof Error ? e.message : String(e ?? "");
            const isZeroWidthSlotError =
              message.includes("No slot size for availableWidth=0") ||
              message.includes("availableWidth=0");

            // AdSense can still report width=0 during transient layout states; retry a few times first.
            if (isZeroWidthSlotError && retryCount < MAX_LAYOUT_RETRIES) {
              retryCount += 1;
              retryTimer = window.setTimeout(tryPush, PUSH_RETRY_MS);
              return;
            }

            setShowFallback(true);
            console.warn("AdSense push error:", e);
          }
        });
      });
    };

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) tryPush();
      },
      { rootMargin: "80px 0px", threshold: 0.01 }
    );

    const ro = new ResizeObserver(() => {
      if (!pushed.current) tryPush();
    });

    const wrap = wrapRef.current;
    if (wrap) io.observe(wrap);
    ro.observe(el);
    if (wrap) ro.observe(wrap);
    window.addEventListener(ADSENSE_READY_EVENT, tryPush);
    tryPush();

    return () => {
      cancelled = true;
      io.disconnect();
      ro.disconnect();
      window.removeEventListener(ADSENSE_READY_EVENT, tryPush);
      if (fallbackTimer) window.clearTimeout(fallbackTimer);
      if (retryTimer) window.clearTimeout(retryTimer);
    };
  }, []);

  return (
    <div
      ref={wrapRef}
      className="w-full max-w-full overflow-hidden rounded-lg min-h-[90px] min-w-0"
      aria-label="Advertisement"
    >
      {showFallback ? (
        <div className="w-full min-h-[90px] rounded-lg border border-gray-700 bg-gray-800/60 px-4 py-3 text-sm text-gray-300">
          Advertisement unavailable right now.
        </div>
      ) : (
        <ins
          ref={insRef}
          className="adsbygoogle mx-auto"
          style={{ display: "block", width: "100%", minHeight: 90 }}
          data-ad-client={ADSENSE_CLIENT}
          data-ad-slot={ADSENSE_SLOT}
          data-ad-format="auto"
          data-full-width-responsive="true"
        />
      )}
    </div>
  );
}
