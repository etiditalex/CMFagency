"use client";

import Script from "next/script";
import { useRef, useEffect, useCallback, useState } from "react";

declare global {
  interface Window {
    grecaptcha?: {
      render: (
        container: string | HTMLElement,
        options: { sitekey: string; callback?: (token: string) => void }
      ) => number;
      reset: (widgetId?: number) => void;
      getResponse: (widgetId?: number) => string;
    };
  }
}

interface RecaptchaProps {
  siteKey: string;
  onVerify: (token: string) => void;
  onExpire?: () => void;
  className?: string;
}

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
    if (!siteKey || !containerRef.current || !scriptReady || typeof window === "undefined" || !window.grecaptcha) return;
    try {
      widgetIdRef.current = window.grecaptcha.render(containerRef.current, {
        sitekey: siteKey,
        callback,
        "expired-callback": () => {
          onVerify("");
          onExpire?.();
        },
      });
    } catch (e) {
      console.warn("reCAPTCHA render error:", e);
    }
    return () => {
      if (widgetIdRef.current != null && window.grecaptcha) {
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
        strategy="lazyOnload"
        onLoad={() => setScriptReady(true)}
      />
      <div ref={containerRef} className={className} />
    </>
  );
}
