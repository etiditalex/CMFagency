"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

import NewsletterSubscribeForm from "@/components/NewsletterSubscribeForm";

const CYCLE_MS = 150000; // 2.5 minutes visible ↔ 2.5 minutes hidden

/**
 * Center-screen newsletter modal on /blogs: toggles every 2.5 minutes (unless reduced motion).
 */
export default function BlogNewsletterBannerPopup() {
  const [visible, setVisible] = useState(true);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduceMotion(mq.matches);
    const onChange = () => setReduceMotion(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (reduceMotion) return;
    const id = window.setInterval(() => {
      setVisible((v) => !v);
    }, CYCLE_MS);
    return () => window.clearInterval(id);
  }, [reduceMotion]);

  const show = reduceMotion ? true : visible;

  return (
    <div
      className={`fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-6 transition-opacity duration-300 ease-out ${
        show ? "bg-black/45 opacity-100 pointer-events-auto backdrop-blur-[2px]" : "pointer-events-none opacity-0 invisible"
      }`}
      aria-hidden={!show}
      role="dialog"
      aria-modal="true"
      aria-labelledby="blog-newsletter-banner-title"
    >
      <div
        className={`relative w-full max-w-lg sm:max-w-xl transform transition-all duration-300 ease-out ${
          show ? "scale-100 translate-y-0" : "scale-95 translate-y-3"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="rounded-2xl bg-primary-600 text-white shadow-2xl ring-1 ring-white/15 p-6 sm:p-8">
          <div className="flex justify-between items-start gap-4 mb-5 sm:mb-6">
            <h2
              id="blog-newsletter-banner-title"
              className="text-xl sm:text-2xl md:text-[1.65rem] font-bold text-white leading-tight pr-2"
            >
              Subscribe to our newsletter
            </h2>
            <button
              type="button"
              onClick={() => setVisible(false)}
              className="shrink-0 rounded-lg p-2 text-white/90 hover:bg-white/15 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
              aria-label="Dismiss newsletter"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <NewsletterSubscribeForm variant="blogs" />
        </div>
      </div>
    </div>
  );
}
