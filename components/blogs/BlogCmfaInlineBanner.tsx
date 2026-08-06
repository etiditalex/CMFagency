"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import CmfAwardsTicketModal from "@/components/CmfAwardsTicketModalLazy";

function MarkIcon() {
  return (
    <div
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-primary-950 text-primary-100 shadow-inner"
      aria-hidden
    >
      <svg viewBox="0 0 32 32" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <path d="M16 6 26 16 16 26 6 16 16 6Z" className="text-primary-300" />
      </svg>
    </div>
  );
}

function ColDivider({ className = "" }: { className?: string }) {
  return (
    <div
      className={`shrink-0 border-primary-950/15 md:w-px md:self-stretch md:border-0 md:bg-primary-950/15 ${className}`}
      aria-hidden
    />
  );
}

/**
 * Horizontal promo strip for CMFA 2026 on blog posts — layout inspired by multi-column event ribbons,
 * colours from site primary/secondary tokens.
 */
export default function BlogCmfaInlineBanner() {
  const [ticketOpen, setTicketOpen] = useState(false);

  return (
    <>
    <aside
      className="not-prose my-6 overflow-hidden rounded-lg border border-primary-200 bg-gradient-to-br from-primary-50 via-primary-100 to-primary-200/90 font-sans shadow-sm"
      aria-label="Coast Fashion and Modelling Awards 2026"
    >
      <div className="relative">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(30,88,202,0.08)_0%,_transparent_65%)]"
          aria-hidden
        />
        <div className="relative flex flex-col divide-y divide-primary-950/10 p-2.5 sm:p-3 md:divide-y-0 md:flex-row md:items-stretch md:gap-0 md:p-0">
          {/* Brand + title */}
          <div className="flex flex-1 items-center gap-2 pb-2 md:min-w-0 md:px-3 md:py-1.5 md:pb-1.5">
            <MarkIcon />
            <div className="min-w-0 text-left">
              <p className="font-serif text-sm font-bold leading-tight text-primary-950 sm:text-base">
                Coast Fashion &amp; Modelling Awards 2026
              </p>
              <p className="mt-px text-[0.55rem] font-semibold uppercase tracking-[0.12em] text-primary-800">
                Mombasa, Kenya · 15 Aug 2026
              </p>
            </div>
          </div>
          <ColDivider className="hidden md:block" />

          {/* Tagline */}
          <div className="flex flex-[1.15] items-center py-2 md:px-3 md:py-1.5">
            <p className="text-left font-serif text-[0.65rem] italic leading-tight text-primary-950 sm:text-xs">
              &ldquo;Celebrating heritage, empowering youth talent, and advancing sustainable fashion &amp;
              eco-tourism.&rdquo;
            </p>
          </div>
          <ColDivider className="hidden md:block" />

          {/* Tickets */}
          <div className="flex items-stretch py-2 md:w-auto md:py-0 md:shrink-0">
            <div className="flex w-full flex-col justify-center rounded-md bg-primary-950 px-3 py-1.5 text-center shadow-md md:rounded-none md:px-4 md:py-2">
              <p className="text-[0.55rem] font-semibold uppercase tracking-wider text-primary-200">Tickets from</p>
              <p className="mt-px font-sans text-base font-bold tabular-nums text-primary-50 sm:text-lg">
                KES 500
              </p>
              <p className="mt-px text-[0.5rem] leading-tight text-primary-300/90">Early bird · more on event page</p>
            </div>
          </div>
          <ColDivider className="hidden md:block" />

          {/* Date highlight */}
          <div className="flex flex-col justify-center py-2 text-left md:px-3 md:py-1.5">
            <p className="font-serif text-2xl font-bold leading-none text-primary-950">15</p>
            <p className="mt-px text-[0.55rem] font-semibold uppercase tracking-[0.1em] text-primary-800">
              Aug 2026
            </p>
          </div>
          <ColDivider className="hidden md:block" />

          {/* Edition */}
          <div className="flex flex-col justify-center py-2 text-left md:px-3 md:py-1.5">
            <p className="font-serif text-lg font-bold text-primary-950 sm:text-xl">CMFA</p>
            <p className="mt-px text-[0.55rem] font-semibold uppercase tracking-[0.1em] text-primary-800">
              2026 edition
            </p>
          </div>
          <ColDivider className="hidden md:block" />

          {/* CTA */}
          <div className="flex items-stretch pt-2 md:pt-0 md:shrink-0">
            <button
              type="button"
              onClick={() => setTicketOpen(true)}
              className="flex min-h-[2.25rem] w-full items-center justify-center gap-1 bg-primary-950 px-3 py-2 text-center text-[0.7rem] font-mono font-bold uppercase tracking-wide text-primary-50 shadow-md transition hover:bg-primary-900 md:min-h-0 md:min-w-[7.5rem] md:text-xs"
              aria-haspopup="dialog"
              aria-label="Register — open ticket tiers and payment"
            >
              Register
              <ArrowRight className="h-3 w-3 md:h-3.5 md:w-3.5" strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </div>
    </aside>
    <CmfAwardsTicketModal open={ticketOpen} onClose={() => setTicketOpen(false)} />
    </>
  );
}
