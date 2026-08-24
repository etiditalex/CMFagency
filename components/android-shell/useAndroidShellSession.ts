"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const STORAGE_KEY = "cmf_android_shell";

/**
 * True when this browser session was launched from the Android Play Store shell
 * (hub `/app` or `?app=1`). Used to hide marketing chrome so users stay in the
 * four live modules.
 */
export function useAndroidShellSession(): boolean {
  const pathname = usePathname();
  const [active, setActive] = useState(false);

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (pathname === "/app" || pathname.startsWith("/app/") || params.get("app") === "1") {
        sessionStorage.setItem(STORAGE_KEY, "1");
      }
      setActive(sessionStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      setActive(false);
    }
  }, [pathname]);

  return active;
}
