"use client";

import { useEffect } from "react";

const CLIENT = "ca-pub-7231529725117325";
const SRC = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${CLIENT}`;

/**
 * Loads the AdSense bootstrap script without Next.js `<Script>` attributes
 * (e.g. `data-nscript`), which trigger an AdSense console warning.
 */
export default function AdSenseLoader() {
  useEffect(() => {
    const existing = document.querySelector(`script[src*="pagead/js/adsbygoogle.js"]`);
    if (existing) return;
    const s = document.createElement("script");
    s.src = SRC;
    s.async = true;
    s.crossOrigin = "anonymous";
    document.head.appendChild(s);
  }, []);
  return null;
}
