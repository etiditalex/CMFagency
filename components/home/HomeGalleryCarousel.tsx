"use client";

import { useEffect, useMemo, useRef } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";

export default function HomeGalleryCarousel() {
  // Curated from images already used across the site (Cloudinary). Add more URLs here as new images are uploaded.
  const images = useMemo(
    () => [
      // CFMA / Fashion (auditions + awards)
      "https://res.cloudinary.com/dyfnobo9r/image/upload/v1768448263/HighFashionAudition20251_ufpxud.jpg",
      "https://res.cloudinary.com/dyfnobo9r/image/upload/v1768448264/HighFashionAudition202510_a1pxnz.jpg",
      "https://res.cloudinary.com/dyfnobo9r/image/upload/v1768448264/HighFashionAudition202511_rsqv2k.jpg",
      "https://res.cloudinary.com/dyfnobo9r/image/upload/v1768448264/HighFashionAudition202512_uju1mf.jpg",
      "https://res.cloudinary.com/dyfnobo9r/image/upload/v1768448264/HighFashionAudition202513_zkzinl.jpg",
      "https://res.cloudinary.com/dyfnobo9r/image/upload/v1768448264/HighFashionAudition20253_s06u7f.jpg",
      "https://res.cloudinary.com/dyfnobo9r/image/upload/v1768448264/HighFashionAudition20254_jqmkem.jpg",
      "https://res.cloudinary.com/dyfnobo9r/image/upload/v1768448264/HighFashionAudition20255_dwiebf.jpg",
      "https://res.cloudinary.com/dyfnobo9r/image/upload/v1768448265/HighFashionAudition20257_aptp81.jpg",
      "https://res.cloudinary.com/dyfnobo9r/image/upload/v1768448265/HighFashionAudition20258_r7vl6r.jpg",
      "https://res.cloudinary.com/dyfnobo9r/image/upload/v1768448265/HighFashionAudition20259_xdcl8g.jpg",
      "https://res.cloudinary.com/dyfnobo9r/image/upload/v1768448265/HighFashionAudition202514_kwly2p.jpg",

      "https://res.cloudinary.com/dyfnobo9r/image/upload/v1767037227/CoastFashionsandmodellingawards1_bdf13y.jpg",
      "https://res.cloudinary.com/dyfnobo9r/image/upload/v1767037228/CoastFashionsandmodellingawards2_defemi.jpg",
      "https://res.cloudinary.com/dyfnobo9r/image/upload/v1767037228/CoastFashionsandmodellingawards3_nw8dby.jpg",
      "https://res.cloudinary.com/dyfnobo9r/image/upload/v1767037229/CoastFashionsandmodellingawards8_ifgxzv.jpg",

      // Events / general
      "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892265/IMG_9922_mbb7gc.jpg",
      "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892266/IMG_9928_tv36eu.jpg",
      "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892267/IMG_9942_jmpqcq.jpg",
      "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892267/IMG_9940_btsrbk.jpg",
      "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892263/IMG_9856_x8kq7w.jpg",
      "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892265/IMG_9925_t4co5j.jpg",

      // Global Women Impact / Kings Experience
      "https://res.cloudinary.com/dyfnobo9r/image/upload/v1767153675/Global_women_impact_1_q8cocr.jpg",
      "https://res.cloudinary.com/dyfnobo9r/image/upload/v1767153675/Global_women_impact_2_adeysa.jpg",
      "https://res.cloudinary.com/dyfnobo9r/image/upload/v1767154664/The_Kings_Experience_1_ime4hx.jpg",
      "https://res.cloudinary.com/dyfnobo9r/image/upload/v1767154665/The_Kings_Experience_2_fixdek.jpg",
      "https://res.cloudinary.com/dyfnobo9r/image/upload/v1767154665/The_Kings_Experience_4_rcq1m6.jpg",
      "https://res.cloudinary.com/dyfnobo9r/image/upload/v1767154665/The_Kings_Experience_8_jjuk4p.jpg",

      // Homepage / brand imagery
      "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765955875/WhatsApp_Image_2025-12-17_at_9.33.02_AM_cjrrxx.jpg",
      "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765955876/WhatsApp_Image_2025-12-17_at_9.32.06_AM_loqhra.jpg",
      "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765955876/WhatsApp_Image_2025-12-17_at_9.31.49_AM_m3hebl.jpg",
      "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765955877/WhatsApp_Image_2025-12-17_at_9.32.55_AM_pbzaj5.jpg",
    ],
    []
  );

  const scrollerRef = useRef<HTMLDivElement | null>(null);

  const scrollByAmount = (dir: "left" | "right") => {
    const el = scrollerRef.current;
    if (!el) return;
    const amount = Math.round(el.clientWidth * 0.8);
    el.scrollBy({ left: dir === "left" ? -amount : amount, behavior: "smooth" });
  };

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const t = window.setInterval(() => {
      // If user is at end, loop back to start
      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 10;
      if (atEnd) el.scrollTo({ left: 0, behavior: "smooth" });
      else el.scrollBy({ left: Math.round(el.clientWidth * 0.6), behavior: "smooth" });
    }, 5500);
    return () => window.clearInterval(t);
  }, []);

  return (
    <section className="section-padding bg-white">
      {/* Keep heading aligned to site container */}
      <div className="container-custom">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10"
        >
          <div className="flex items-center justify-center gap-4">
            <div className="hidden sm:block h-px w-24 bg-gray-200" />
            <h2 className="text-xl md:text-2xl font-extrabold tracking-widest text-secondary-600 uppercase">
              Gallery
            </h2>
            <div className="hidden sm:block h-px w-24 bg-gray-200" />
          </div>
          <p className="mt-3 text-gray-600">
            Highlights from our events, campaigns, and creative work.
          </p>
        </motion.div>
      </div>

      {/* Full-bleed carousel strip */}
      <div className="relative w-screen left-1/2 -translate-x-1/2">
        {/* Arrows */}
        <button
          onClick={() => scrollByAmount("left")}
          className="absolute left-3 md:left-6 top-1/2 -translate-y-1/2 z-10 bg-white/85 hover:bg-white border border-gray-200 shadow-md rounded-full p-3"
          aria-label="Previous"
        >
          <ChevronLeft className="w-5 h-5 text-primary-700" />
        </button>
        <button
          onClick={() => scrollByAmount("right")}
          className="absolute right-3 md:right-6 top-1/2 -translate-y-1/2 z-10 bg-white/85 hover:bg-white border border-gray-200 shadow-md rounded-full p-3"
          aria-label="Next"
        >
          <ChevronRight className="w-5 h-5 text-primary-700" />
        </button>

        {/* Carousel */}
        <div
          ref={scrollerRef}
          className="flex gap-5 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-4 px-4 md:px-10"
          style={{ scrollbarWidth: "none" as any }}
        >
          {images.map((src) => (
            <div
              key={src}
              className="snap-center min-w-[260px] sm:min-w-[320px] md:min-w-[380px] lg:min-w-[420px]"
            >
              <div className="relative overflow-hidden rounded-md border border-gray-200 bg-gray-50 shadow-sm aspect-[4/3] group">
                <Image
                  src={src}
                  alt="Gallery image"
                  fill
                  className="object-cover object-center transition-transform duration-500 group-hover:scale-[1.03]"
                  sizes="(max-width: 768px) 85vw, 420px"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
              </div>
            </div>
          ))}
        </div>

        {/* Hide scrollbars in WebKit */}
        <style jsx>{`
          div::-webkit-scrollbar {
            display: none;
          }
        `}</style>
      </div>
    </section>
  );
}

