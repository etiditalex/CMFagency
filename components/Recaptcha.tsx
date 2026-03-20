"use client";

import Script from "next/script";
import { useRef, useEffect, useCallback, useState } from "react";

export type RecaptchaClientVersion = "v2" | "v3";

declare global {
  interface Window {
    grecaptcha?: {
      ready?: (cb: () => void) => void;
      execute?: (siteKey: string, options: { action: string }) => Promise<string>;
      render?: (
        container: string | HTMLElement,
        options: { sitekey: string; callback?: (token: string) => void }
      ) => number;
      reset?: (widgetId?: number) => void;
      getResponse?: (widgetId?: number) => string;
    };
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * reCAPTCHA v3: run after `RecaptchaV3Script` has loaded.
 * Waits briefly for the Google script (users often submit before `onLoad` finishes).
 */
export async function executeRecaptchaV3(
  siteKey: string,
  action: string,
  options?: { maxWaitMs?: number }
): Promise<string> {
  if (typeof window === "undefined") {
    throw new Error("reCAPTCHA not available");
  }
  const maxWaitMs = options?.maxWaitMs ?? 12_000;
  const deadline = Date.now() + maxWaitMs;

  while (Date.now() < deadline) {
    const g = window.grecaptcha;
    const readyFn = g?.ready;
    const executeFn = g?.execute;
    if (readyFn && executeFn) {
      return new Promise((resolve, reject) => {
        readyFn(() => {
          executeFn(siteKey, { action }).then(resolve).catch(reject);
        });
      });
    }
    await sleep(80);
  }
  throw new Error("reCAPTCHA v3 not loaded");
}

/** Loads reCAPTCHA v3 — shows the bottom-right “Privacy - Terms” badge automatically. */
export function RecaptchaV3Script({ siteKey }: { siteKey: string }) {
  if (!siteKey) return null;
  return (
    <Script
      src={`https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(siteKey)}`}
      strategy="afterInteractive"
    />
  );
}

interface RecaptchaProps {
  siteKey: string;
  onVerify: (token: string) => void;
  onExpire?: () => void;
  className?: string;
}

/** reCAPTCHA v2 checkbox (“I’m not a robot”). */
export function Recaptcha({ siteKey, onVerify, onExpire, className }: RecaptchaProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<number | null>(null);
  const [scriptReady, setScriptReady] = useState(false);

  const callback = useCallback(
    (token: string) => {
      onVerify(token);
    },
    [onVerify]
  );

  useEffect(() => {
    if (!siteKey || !containerRef.current || !scriptReady || typeof window === "undefined" || !window.grecaptcha?.render) return;
    try {
      const options = {
        sitekey: siteKey,
        callback,
        "expired-callback": () => {
          onVerify("");
          onExpire?.();
        },
      };
      widgetIdRef.current = window.grecaptcha.render(
        containerRef.current,
        options as { sitekey: string; callback?: (token: string) => void; "expired-callback"?: () => void }
      );
    } catch (e) {
      console.warn("reCAPTCHA render error:", e);
    }
    return () => {
      if (widgetIdRef.current != null && window.grecaptcha?.reset) {
        try {
          window.grecaptcha.reset(widgetIdRef.current);
        } catch (_) {}
      }
      widgetIdRef.current = null;
    };
  }, [siteKey, callback, scriptReady, onExpire, onVerify]);

  if (!siteKey) return null;

  return (
    <>
      <Script
        src="https://www.google.com/recaptcha/api.js?render=explicit"
        strategy="afterInteractive"
        onLoad={() => setScriptReady(true)}
      />
      <div
        ref={containerRef}
        className={className}
        style={{ minHeight: 78 }}
        data-recaptcha-container
        aria-label="Security verification"
      />
    </>
  );
}
