"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { COOKIE_CONSENT_EVENT, readCookieConsent } from "@/lib/cookie-consent";

const CLIENT = "ca-pub-7231529725117325";
const SRC = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${CLIENT}`;
const ADSENSE_READY_EVENT = "adsense:ready";
const GA_ID = "G-46VYE6KM7V";
const GA_SRC = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;

/** Screens without publisher content. The ad script stays off these routes. */
const BLOCKED_PREFIXES = [
  "/dashboard",
  "/login",
  "/poll",
  "/research",
  "/cart",
  "/invoice",
  "/pay",
  "/profile",
  "/fusion-xpress",
  "/kcm/member-portal",
  "/invite",
  "/verify-email",
  "/track-application",
  "/gate",
  "/app",
  "/teams-work",
  "/events/nominate-model",
  "/events/register",
  "/events/register-as-model",
  "/events/cmfa-registration",
  "/events/upcoming/cmfa-registration",
  "/nominate-models",
];

function isBlockedPath(pathname: string) {
  return BLOCKED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function setAnalyticsDisabled(disabled: boolean) {
  const flags = window as unknown as Record<string, boolean>;
  flags[`ga-disable-${GA_ID}`] = disabled;
}

function loadAnalytics() {
  setAnalyticsDisabled(false);
  const w = window as Window & {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  };
  w.dataLayer = w.dataLayer || [];
  if (!w.gtag) {
    w.gtag = function gtag() {
      // Google's snippet expects the arguments object.
      w.dataLayer?.push(arguments);
    };
  }
  if (!document.querySelector(`script[src*="googletagmanager.com/gtag/js?id=${GA_ID}"]`)) {
    const script = document.createElement("script");
    script.src = GA_SRC;
    script.async = true;
    document.head.appendChild(script);
  }
  w.gtag("js", new Date());
  w.gtag("config", GA_ID);
}

function clearPlacedAds() {
  document
    .querySelectorAll('iframe[src*="googlesyndication"], iframe[src*="doubleclick.net"], iframe[id^="google_ads"]')
    .forEach((node) => node.remove());
  document.querySelectorAll("ins.adsbygoogle").forEach((ins) => {
    ins.removeAttribute("data-adsbygoogle-status");
    ins.replaceChildren();
  });
}

/**
 * Loads AdSense only after advertising cookies are accepted, and only on
 * pages that have publisher content. Analytics follows the same choice.
 * The script is created in the browser so Next.js does not add `data-nscript`.
 */
export default function AdSenseLoader() {
  const pathname = usePathname() ?? "";

  useEffect(() => {
    let cancelled = false;
    let idleId: number | undefined;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const markReady = (script: HTMLScriptElement) => {
      script.dataset.adsenseLoaded = "true";
      window.dispatchEvent(new Event(ADSENSE_READY_EVENT));
    };

    const injectAds = () => {
      if (cancelled) return;
      const existing = document.querySelector(`script[src*="pagead/js/adsbygoogle.js"]`) as HTMLScriptElement | null;
      if (existing) {
        if (existing.dataset.adsenseLoaded === "true") {
          window.dispatchEvent(new Event(ADSENSE_READY_EVENT));
        } else {
          existing.addEventListener("load", () => markReady(existing), { once: true });
        }
        return;
      }
      const script = document.createElement("script");
      script.src = SRC;
      script.async = true;
      script.crossOrigin = "anonymous";
      script.addEventListener("load", () => markReady(script), { once: true });
      document.head.appendChild(script);
    };

    const sync = () => {
      if (cancelled) return;
      const consent = readCookieConsent();
      if (consent !== "accepted") {
        setAnalyticsDisabled(true);
        clearPlacedAds();
        return;
      }

      loadAnalytics();
      if (isBlockedPath(pathname)) {
        clearPlacedAds();
        return;
      }
      injectAds();
    };

    const schedule = () => {
      if (cancelled) return;
      if ("requestIdleCallback" in window) {
        idleId = window.requestIdleCallback(sync, { timeout: 4500 });
      } else {
        timeoutId = setTimeout(sync, 2800);
      }
    };

    const onConsent = () => {
      if (idleId !== undefined && "cancelIdleCallback" in window) {
        window.cancelIdleCallback(idleId);
        idleId = undefined;
      }
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
        timeoutId = undefined;
      }
      sync();
    };

    schedule();
    window.addEventListener(COOKIE_CONSENT_EVENT, onConsent);

    return () => {
      cancelled = true;
      window.removeEventListener(COOKIE_CONSENT_EVENT, onConsent);
      if (idleId !== undefined && "cancelIdleCallback" in window) {
        window.cancelIdleCallback(idleId);
      }
      if (timeoutId !== undefined) clearTimeout(timeoutId);
    };
  }, [pathname]);

  return null;
}
