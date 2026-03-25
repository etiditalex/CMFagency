"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Briefcase, Check, Mail, TrendingUp } from "lucide-react";

import AdSenseBlock from "@/components/AdSenseBlock";
import NewsletterSubscribeForm from "@/components/NewsletterSubscribeForm";
import type { BlogSidebarAdRow, BlogTrendingRow } from "@/lib/blog-server";

const PROMO_ROTATE_MS = 5500;

function PromoSlide({ ad }: { ad: BlogSidebarAdRow }) {
  const inner = (
    <>
      {ad.image_url ? (
        <div className="w-full flex justify-center items-center rounded-lg overflow-hidden bg-gray-100 min-h-0">
          <img
            src={ad.image_url}
            alt={ad.title ? `${ad.title} (promo)` : "Promotional image"}
            className="block max-w-full w-auto h-auto max-h-[min(260px,50vh)] object-contain object-center"
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
    <div className="rounded-xl overflow-hidden border border-gray-200 bg-white shadow-sm">
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

function BlogSidebarPromoCarousel({ ads }: { ads: BlogSidebarAdRow[] }) {
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

  return (
    <div className="space-y-2">
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
                <PromoSlide ad={ad} />
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

type Props = {
  trending: BlogTrendingRow[];
  sidebarAds: BlogSidebarAdRow[];
};

export default function BlogPostSidebar({ trending, sidebarAds }: Props) {
  return (
    <aside className="space-y-8 lg:sticky lg:top-28 self-start">
      {/* Newsletter — same blue as navbar top bar (bg-primary-600) */}
      <div className="rounded-xl overflow-hidden shadow-md bg-primary-600 text-white p-6 ring-1 ring-white/15">
        <div className="flex items-start gap-3 mb-4">
          <div className="rounded-lg bg-white/15 p-2 shrink-0">
            <Mail className="w-5 h-5 text-white" aria-hidden />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white leading-tight">Newsletter</h3>
            <p className="text-sm text-white/90 mt-1.5 leading-relaxed">
              Get new articles and occasional announcements by email.
            </p>
          </div>
        </div>
        <NewsletterSubscribeForm variant="blogSidebar" />
      </div>

      {/* Job board — same blue as navbar top bar */}
      <Link
        href="/jobs"
        className="block rounded-xl overflow-hidden shadow-md bg-primary-600 text-white p-6 ring-1 ring-white/15 hover:bg-primary-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-50"
      >
        <div className="flex items-start gap-3 mb-3">
          <div className="rounded-lg bg-white/15 p-2 shrink-0">
            <Briefcase className="w-5 h-5 text-white" aria-hidden />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white leading-tight">Explore the job board</h3>
            <p className="text-sm text-white/90 mt-1.5 leading-relaxed">
              Remote-friendly roles, regional listings, and openings we share with our community.
            </p>
          </div>
        </div>
        <span className="inline-flex items-center text-sm font-bold text-white bg-white/20 hover:bg-white/25 px-4 py-2 rounded-lg mt-2 transition-colors">
          Browse jobs →
        </span>
      </Link>

      <div className="rounded-xl overflow-hidden shadow-md bg-primary-600 text-white p-6 ring-1 ring-white/15">
        <h3 className="text-lg font-bold mb-4 text-white">Why Changer Fusions</h3>
        <ul className="space-y-3 text-sm leading-relaxed text-white/95">
          <li className="flex gap-2">
            <Check className="w-5 h-5 shrink-0 text-primary-200" aria-hidden />
            <span>Keep your data local for maximum control and protection.</span>
          </li>
          <li className="flex gap-2">
            <Check className="w-5 h-5 shrink-0 text-primary-200" aria-hidden />
            <span>Foster growth in Africa&apos;s digital economy.</span>
          </li>
          <li className="flex gap-2">
            <Check className="w-5 h-5 shrink-0 text-primary-200" aria-hidden />
            <span>Marketing, events, and branding that fits your market.</span>
          </li>
        </ul>
      </div>

      {trending.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-primary-600" aria-hidden />
            <h3 className="text-lg font-bold text-gray-900">Top reads</h3>
          </div>
          <ul className="space-y-3">
            {trending.map((p) => (
              <li key={p.slug}>
                <Link
                  href={`/blogs/${p.slug}`}
                  className="text-sm font-medium text-gray-800 hover:text-primary-600 leading-snug transition-colors"
                >
                  {p.title}
                </Link>
              </li>
            ))}
          </ul>
          <Link
            href="/blogs"
            className="inline-block mt-4 text-sm font-semibold text-primary-600 hover:text-primary-700"
          >
            View all articles →
          </Link>
        </div>
      )}

      {sidebarAds.length > 0 && <BlogSidebarPromoCarousel ads={sidebarAds} />}

      <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/80 p-4 min-h-[120px]">
        <p className="text-xs text-gray-500 mb-2 text-center">Advertisement</p>
        <AdSenseBlock />
      </div>
    </aside>
  );
}
