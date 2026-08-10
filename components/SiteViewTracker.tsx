"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Records at most one public site view per browser every 12 hours
 * (enforced by the API cookie). Skips dashboard and internal portals.
 */
export default function SiteViewTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) return;
    if (
      pathname.startsWith("/dashboard") ||
      pathname.startsWith("/api") ||
      pathname.startsWith("/kcm/member-portal") ||
      pathname.startsWith("/teams-work/portal")
    ) {
      return;
    }

    let cancelled = false;
    const run = async () => {
      try {
        await fetch("/api/site-views", { method: "POST", credentials: "same-origin" });
      } catch {
        // Non-blocking — views UI will still try GET.
      }
      if (cancelled) return;
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  return null;
}
