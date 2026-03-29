"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import BlogColumnsWidget from "@/components/blogs/BlogColumnsWidget";
import type { BlogColumnSidebarRow, BlogTrendingRow } from "@/lib/blog-server";

const CMFA_EVENT_HREF = "/events/upcoming/coast-fashion-modelling-awards-2026";
const UPCOMING_EVENTS_HREF = "/events/upcoming";
/** Same asset as `CfmaPopupBanner` — CMFA 2026 poster. */
const CMFA_BANNER_IMAGE =
  "https://res.cloudinary.com/dyfnobo9r/image/upload/v1768551251/CFMA_qxfe0m.jpg";

function whatsappCommunityHref(): string {
  const invite = process.env.NEXT_PUBLIC_WHATSAPP_COMMUNITY_URL?.trim();
  if (invite) return invite;
  return `https://wa.me/254797777347?text=${encodeURIComponent(
    "Hi — I'd like to join the Changer Fusions WhatsApp community."
  )}`;
}

type Props = {
  trending: BlogTrendingRow[];
  columnPosts: BlogColumnSidebarRow[];
  className?: string;
};

/**
 * Sidebar for the main /blogs listing: trending posts + CTAs for events, WhatsApp, and Fusion Xpress.
 */
export default function BlogListingSidebar({ trending, columnPosts, className = "" }: Props) {
  const communityUrl = whatsappCommunityHref();

  return (
    <aside className={`space-y-6 lg:sticky lg:top-24 self-start ${className}`}>
      {trending.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900 mb-2">Trend news</h2>
          <p className="text-xs text-gray-500 mb-3 leading-relaxed">
            Latest stories from our blog — fresh reads worth your time.
          </p>
          <ul className="space-y-3">
            {trending.map((p) => (
              <li key={p.slug}>
                <Link
                  href={`/blogs/${p.slug}`}
                  className="text-sm font-medium text-gray-800 hover:text-primary-600 leading-snug transition-colors line-clamp-3"
                >
                  {p.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="rounded-xl overflow-hidden border border-gray-200 bg-gradient-to-br from-primary-600 to-primary-800 text-white shadow-md ring-1 ring-white/10">
        <Link
          href={CMFA_EVENT_HREF}
          className="block relative aspect-[4/3] w-full bg-black outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/80"
        >
          <img
            src={CMFA_BANNER_IMAGE}
            alt="Coast Fashion and Modelling Awards 2026 — CMFA banner"
            className="absolute inset-0 h-full w-full object-cover object-center"
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-4 text-center">
            <div className="inline-flex items-center rounded-full bg-secondary-600 text-white px-3 py-0.5 text-[10px] font-bold tracking-widest">
              UPCOMING
            </div>
            <p className="mt-2 text-sm font-extrabold text-white drop-shadow-sm">CFMA 2026 • Mombasa</p>
          </div>
        </Link>
        <div className="p-5 text-center">
          <h2 className="text-lg font-bold leading-tight">Upcoming CMFA event</h2>
          <p className="text-sm text-white/90 mt-1.5 leading-relaxed">
            Coast Fashion &amp; Modelling Awards 2026 — join us in Mombasa for our flagship weekend.
          </p>
          <div className="mt-4 flex flex-col items-center gap-2.5">
            <Link
              href={CMFA_EVENT_HREF}
              className="inline-flex w-full max-w-[280px] items-center justify-center gap-2 text-sm font-bold text-white bg-white/20 hover:bg-white/30 px-4 py-2.5 rounded-lg transition-colors"
            >
              View event details
              <ArrowRight className="w-4 h-4 shrink-0" />
            </Link>
            <div className="w-full max-w-[280px] pt-3 mt-1 border-t border-white/20">
              <Link
                href={CMFA_EVENT_HREF}
                className="inline-flex w-full items-center justify-center gap-2 text-sm font-bold text-primary-900 bg-white hover:bg-white/95 px-4 py-2.5 rounded-lg transition-colors"
              >
                Buy tickets online
                <ArrowRight className="w-4 h-4 shrink-0" />
              </Link>
              <Link
                href={UPCOMING_EVENTS_HREF}
                className="mt-3 inline-flex w-full items-center justify-center text-xs font-semibold text-white/90 hover:text-white underline underline-offset-2"
              >
                More upcoming events
              </Link>
            </div>
          </div>
        </div>
      </div>

      <a
        href={communityUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="block rounded-xl overflow-hidden border-2 border-emerald-500/40 bg-gradient-to-br from-emerald-600 to-emerald-800 text-white p-5 shadow-md hover:from-emerald-500 hover:to-emerald-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-50"
      >
        <h2 className="text-lg font-bold leading-tight text-center">WhatsApp community</h2>
        <p className="text-sm text-white/90 mt-1.5 leading-relaxed text-center">
          Talk with us on our WhatsApp channel — updates, Q&amp;A, and a direct line to the team.
        </p>
        <div className="flex justify-center pt-4">
          <span className="inline-flex items-center justify-center gap-2 text-sm font-bold text-emerald-950 bg-white hover:bg-emerald-50 px-5 py-2.5 rounded-lg min-w-[200px]">
            Open WhatsApp
            <ArrowRight className="w-4 h-4 shrink-0" />
          </span>
        </div>
      </a>

      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-gray-900 leading-tight text-center">Ticketing &amp; voting</h2>
        <p className="text-sm text-gray-600 mt-1.5 leading-relaxed text-center">
          <strong className="text-gray-800">Fusion Xpress</strong> ties ticketing, voting, and gate tools into one smooth
          flow — less friction for guests, clearer control for your team.
        </p>
        <div className="flex justify-center mt-4">
          <Link
            href="/contact"
            className="inline-flex min-w-[220px] items-center justify-center gap-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white font-bold text-sm py-2.5 px-6 transition-colors"
          >
            Ask for a demo — free
            <ArrowRight className="w-4 h-4 shrink-0" />
          </Link>
        </div>
      </div>

      <BlogColumnsWidget posts={columnPosts} />
    </aside>
  );
}
