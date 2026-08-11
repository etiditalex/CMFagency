"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cloudinaryLoader } from "@/lib/cloudinary";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import GalleryLightbox from "@/components/GalleryLightbox";

export default function HomeGalleryCarousel() {
  // Curated from images already used across the site (Cloudinary). Add more URLs here as new images are uploaded.
  const fallbackImages = useMemo(
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

  const [images, setImages] = useState<string[]>(fallbackImages);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const { data, error } = await supabase
          .from("gallery_images")
          .select("image_url,is_featured")
          .eq("is_active", true)
          .order("is_featured", { ascending: false })
          .order("sort_order", { ascending: true })
          .order("id", { ascending: true })
          .limit(40);
        if (error) throw error;
        const rows = (data ?? []) as Array<{ image_url: string }>;
        const urls = rows.map((r) => r.image_url).filter(Boolean);
        if (!cancelled && urls.length > 0) setImages(urls);
      } catch {
        // Keep fallbackImages.
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [fallbackImages]);

  const lightboxImages = useMemo(
    () =>
      images.map((src) => ({
        src,
        alt: "Changer Fusions gallery — events, fashion, and marketing moments",
      })),
    [images]
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
      // Pause auto-scroll while lightbox is open
      if (lightboxIndex != null) return;
      // If user is at end, loop back to start
      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 10;
      if (atEnd) el.scrollTo({ left: 0, behavior: "smooth" });
      else el.scrollBy({ left: Math.round(el.clientWidth * 0.6), behavior: "smooth" });
    }, 5500);
    return () => window.clearInterval(t);
  }, [lightboxIndex]);

  return (
    <section className="bg-white py-10 sm:py-14 md:py-20">
      {/* Keep heading aligned to site container */}
      <div className="container-custom">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-6 text-center sm:mb-8 md:mb-10"
        >
          <div className="flex items-center justify-center gap-4">
            <div className="hidden h-px w-24 bg-gray-200 sm:block" />
            <h2 className="text-lg font-extrabold uppercase tracking-widest text-secondary-600 sm:text-xl md:text-2xl">
              Gallery
            </h2>
            <div className="hidden h-px w-24 bg-gray-200 sm:block" />
          </div>
        </motion.div>
      </div>

      {/* Full-bleed carousel strip */}
      <div className="relative left-1/2 w-screen -translate-x-1/2">
        {/* Arrows */}
        <button
          type="button"
          onClick={() => scrollByAmount("left")}
          className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full border border-gray-200 bg-white/85 p-2.5 shadow-md hover:bg-white sm:left-3 sm:p-3 md:left-6"
          aria-label="Previous"
        >
          <ChevronLeft className="h-5 w-5 text-primary-700" />
        </button>
        <button
          type="button"
          onClick={() => scrollByAmount("right")}
          className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full border border-gray-200 bg-white/85 p-2.5 shadow-md hover:bg-white sm:right-3 sm:p-3 md:right-6"
          aria-label="Next"
        >
          <ChevronRight className="h-5 w-5 text-primary-700" />
        </button>

        {/* Carousel */}
        <div
          ref={scrollerRef}
          className="flex gap-3 overflow-x-auto scroll-smooth snap-x snap-mandatory px-4 pb-3 sm:gap-5 sm:px-6 sm:pb-4 md:px-10"
          style={{ scrollbarWidth: "none" }}
        >
          {images.map((src, index) => (
            <div
              key={src}
              className="min-w-[220px] snap-center sm:min-w-[300px] md:min-w-[360px] lg:min-w-[400px]"
            >
              <button
                type="button"
                onClick={() => setLightboxIndex(index)}
                className="group relative aspect-[4/3] w-full overflow-hidden rounded-md border border-gray-200 bg-gray-50 text-left shadow-sm"
                aria-label={`Expand gallery image ${index + 1}`}
              >
                <Image
                  loader={cloudinaryLoader}
                  src={src}
                  alt="Changer Fusions gallery — events, fashion, and marketing moments"
                  fill
                  className="object-cover object-center transition-transform duration-500 group-hover:scale-[1.03]"
                  sizes="(max-width: 640px) 70vw, (max-width: 768px) 50vw, 400px"
                />
                <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/10" />
              </button>
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

      <GalleryLightbox
        images={lightboxImages}
        index={lightboxIndex}
        onClose={() => setLightboxIndex(null)}
        onChangeIndex={setLightboxIndex}
        label="Homepage gallery image preview"
      />
    </section>
  );
}
