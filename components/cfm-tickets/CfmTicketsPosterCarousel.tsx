"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cloudinaryLoader } from "@/lib/cloudinary";

const POSTER_URLS = [
  "https://res.cloudinary.com/dyfnobo9r/image/upload/v1777690537/cfm_tickets_1_alxjiy.jpg",
  "https://res.cloudinary.com/dyfnobo9r/image/upload/v1777690538/cfm_tickets_2_lrj1oy.jpg",
  "https://res.cloudinary.com/dyfnobo9r/image/upload/v1777690538/cfm_tickets_3_uls5z4.jpg",
  "https://res.cloudinary.com/dyfnobo9r/image/upload/v1777690538/cfm_tickets_4_cud70e.jpg",
  "https://res.cloudinary.com/dyfnobo9r/image/upload/v1777690537/cfm_tickets_5_spo6js.jpg",
  "https://res.cloudinary.com/dyfnobo9r/image/upload/v1777690537/cfm_tickets_6_ctqc59.jpg",
  "https://res.cloudinary.com/dyfnobo9r/image/upload/v1777690537/cfm_tickets_7_eqjjwk.jpg",
] as const;

/**
 * Full-viewport-width poster strip for CFM Tickets (placed below checkout / Lipa Pole Pole).
 */
export default function CfmTicketsPosterCarousel() {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [active, setActive] = useState(0);

  const syncActiveFromScroll = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const w = el.clientWidth || 1;
    const i = Math.round(el.scrollLeft / w);
    setActive(Math.min(Math.max(0, i), POSTER_URLS.length - 1));
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    el.addEventListener("scroll", syncActiveFromScroll, { passive: true });
    return () => el.removeEventListener("scroll", syncActiveFromScroll);
  }, [syncActiveFromScroll]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const id = window.setInterval(() => {
      const w = el.clientWidth;
      const atEnd = el.scrollLeft + w >= el.scrollWidth - 8;
      if (atEnd) el.scrollTo({ left: 0, behavior: "smooth" });
      else el.scrollBy({ left: w, behavior: "smooth" });
    }, 6000);
    return () => window.clearInterval(id);
  }, []);

  const go = (dir: -1 | 1) => {
    const el = scrollerRef.current;
    if (!el) return;
    const w = el.clientWidth;
    el.scrollBy({ left: dir * w, behavior: "smooth" });
  };

  const goTo = (index: number) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTo({ left: index * el.clientWidth, behavior: "smooth" });
  };

  return (
    <section
      className="mt-8 md:mt-10"
      aria-roledescription="carousel"
      aria-label="CFM Awards posters"
    >
      <div className="relative ml-[calc(50%-50vw)] w-screen max-w-[100vw] bg-neutral-100">
        <button
          type="button"
          onClick={() => go(-1)}
          className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full border border-gray-200 bg-white/90 p-2.5 shadow-md transition hover:bg-white md:left-4 md:p-3"
          aria-label="Previous poster"
        >
          <ChevronLeft className="h-5 w-5 text-primary-700 md:h-6 md:w-6" aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => go(1)}
          className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full border border-gray-200 bg-white/90 p-2.5 shadow-md transition hover:bg-white md:right-4 md:p-3"
          aria-label="Next poster"
        >
          <ChevronRight className="h-5 w-5 text-primary-700 md:h-6 md:w-6" aria-hidden />
        </button>

        <div
          ref={scrollerRef}
          className="flex overflow-x-auto scroll-smooth snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {POSTER_URLS.map((src, i) => (
            <div
              key={src}
              className="relative min-h-[min(85vh,720px)] w-full min-w-full shrink-0 snap-center md:min-h-[min(78vh,640px)]"
            >
              <Image
                loader={cloudinaryLoader}
                src={src}
                alt={`Coast Fashion & Modelling Awards poster ${i + 1} of ${POSTER_URLS.length}`}
                fill
                className="object-contain object-center"
                sizes="100vw"
                priority={i === 0}
              />
            </div>
          ))}
        </div>

        <div className="flex justify-center gap-2 py-3 md:py-4">
          {POSTER_URLS.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => goTo(i)}
              className={`h-2 w-2 rounded-full transition md:h-2.5 md:w-2.5 ${
                i === active ? "scale-110 bg-primary-600" : "bg-gray-300 hover:bg-gray-400"
              }`}
              aria-label={`Go to poster ${i + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
