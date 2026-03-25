"use client";

import { useCallback, useEffect, useState } from "react";

import type { BlogSidebarAdRow } from "@/lib/blog-server";

const PROMO_ROTATE_MS = 5500;

export function PromoSlideCard({
  ad,
  imageMaxClass,
  className = "",
}: {
  ad: BlogSidebarAdRow;
  imageMaxClass: string;
  /** Extra classes on outer card */
  className?: string;
}) {
  const inner = (
    <>
      {ad.image_url ? (
        <div className="w-full flex justify-center items-center rounded-lg overflow-hidden bg-gray-100 min-h-0">
          <img
            src={ad.image_url}
            alt={ad.title ? `${ad.title} (promo)` : "Promotional image"}
            className={`block max-w-full w-auto h-auto object-contain object-center ${imageMaxClass}`}
            loading="lazy"
            decoding="async"
          />
        </div>
      ) : null}
      {ad.title ? (
        <p className={`text-sm font-semibold text-gray-900 ${ad.image_url ? "mt-3" : ""}`}>{ad.title}</p>
      ) : null}
    </>
  );
  return (
    <div className={`rounded-xl overflow-hidden border border-gray-200 bg-white shadow-sm ${className}`}>
      {ad.href ? (
        <a
          href={ad.href}
          target="_blank"
          rel="noopener noreferrer"
          className="block p-4 hover:bg-gray-50/80 transition-colors"
        >
          {inner}
        </a>
      ) : (
        <div className="p-4">{inner}</div>
      )}
    </div>
  );
}

type Props = {
  ads: BlogSidebarAdRow[];
  className?: string;
  /** Max height for promo image (Tailwind classes). */
  imageMaxClass?: string;
};

/**
 * Auto-rotating fade carousel for approved blog sidebar promos.
 * Used on article sidebar and on the main /blogs listing.
 */
export default function BlogPromoCarousel({
  ads,
  className = "",
  imageMaxClass = "max-h-[min(260px,50vh)]",
}: Props) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduceMotion(mq.matches);
    const onChange = () => setReduceMotion(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const advance = useCallback(() => {
    setIndex((i) => (i + 1) % ads.length);
  }, [ads.length]);

  useEffect(() => {
    if (ads.length <= 1 || paused || reduceMotion) return;
    const id = window.setInterval(advance, PROMO_ROTATE_MS);
    return () => window.clearInterval(id);
  }, [ads.length, paused, reduceMotion, advance]);

  const durationClass = reduceMotion ? "duration-0" : "duration-700";

  if (ads.length === 0) return null;

  return (
    <div className={`space-y-2 ${className}`}>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-0.5">
        Promotions {ads.length > 1 ? `(${ads.length})` : ""}
      </p>
      <div
        className="relative"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        role="region"
        aria-roledescription="carousel"
        aria-label="Promotional carousel"
      >
        <div className="relative min-h-[120px]">
          {ads.map((ad, idx) => {
            const active = idx === index;
            return (
              <div
                key={ad.id}
                aria-hidden={!active}
                className={`${active ? "relative z-[1]" : "absolute inset-0 z-0 pointer-events-none"} transition-opacity ease-in-out ${durationClass} ${
                  active ? "opacity-100" : "opacity-0"
                }`}
              >
                <PromoSlideCard ad={ad} imageMaxClass={imageMaxClass} />
              </div>
            );
          })}
        </div>

        {ads.length > 1 && (
          <div className="flex justify-center items-center gap-2 pt-3" role="tablist" aria-label="Choose promotion">
            {ads.map((ad, idx) => (
              <button
                key={ad.id}
                type="button"
                role="tab"
                aria-selected={idx === index}
                aria-label={`Promotion ${idx + 1} of ${ads.length}${ad.title ? `: ${ad.title}` : ""}`}
                className={`h-2 rounded-full transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 ${
                  idx === index ? "w-7 bg-primary-600" : "w-2 bg-gray-300 hover:bg-gray-400"
                }`}
                onClick={() => setIndex(idx)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
