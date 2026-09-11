"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { cloudinaryLoader } from "@/lib/cloudinary";

const HERO_VIDEO_ID = "GpbNlgVikiE";
const HERO_POSTER =
  "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892265/IMG_9922_mbb7gc.jpg";

const HERO_EMBED_SRC = `https://www.youtube-nocookie.com/embed/${HERO_VIDEO_ID}?autoplay=1&mute=1&loop=1&playlist=${HERO_VIDEO_ID}&controls=0&rel=0&modestbranding=1&playsinline=1&iv_load_policy=3&disablekb=1&fs=0`;

export default function Hero() {
  const [playVideo, setPlayVideo] = useState(false);

  useEffect(() => {
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (motionQuery.matches) return undefined;

    const enable = () => setPlayVideo(true);
    const timer = window.setTimeout(enable, 80);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <section
      className="relative flex min-h-[58svh] items-center justify-center overflow-hidden pt-24 sm:min-h-[68svh] sm:pt-28 md:min-h-[74svh] md:pt-32 lg:min-h-[82svh] lg:pt-36"
      aria-labelledby="home-hero-heading"
    >
      <div className="relative min-h-[inherit] w-full">
        <div className="absolute inset-0">
          <Image
            loader={cloudinaryLoader}
            src={HERO_POSTER}
            alt=""
            fill
            className="object-cover"
            priority
            fetchPriority="high"
            sizes="100vw"
          />
          {playVideo ? (
            <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
              <iframe
                src={HERO_EMBED_SRC}
                title="Changer Fusions event film"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                className="absolute left-1/2 top-1/2 min-h-full min-w-full -translate-x-1/2 -translate-y-1/2 border-0"
                style={{ width: "177.78vh", height: "56.25vw" }}
              />
            </div>
          ) : null}
          <div className="absolute inset-0 bg-black/55" />
          <div className="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-black/75 to-transparent sm:h-44" />
        </div>

        <div className="relative z-10 flex min-h-[inherit] w-full items-end justify-center pb-[calc(4.75rem+env(safe-area-inset-bottom,0px))] sm:pb-10 md:pb-12 lg:pb-14">
          <motion.h1
            id="home-hero-heading"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.15 }}
            className="w-full max-w-[100%] px-4 text-center text-[1.2rem] font-bold leading-snug tracking-tight text-white drop-shadow-2xl sm:px-6 sm:text-2xl sm:leading-tight md:whitespace-nowrap md:px-8 md:text-[clamp(1.05rem,2.35vw,2.5rem)] md:leading-none lg:px-10"
          >
            Strategic Marketing That Powers Growth and Relevance
          </motion.h1>
        </div>
      </div>
    </section>
  );
}
