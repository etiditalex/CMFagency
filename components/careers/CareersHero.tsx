"use client";

import { motion } from "framer-motion";
import Image from "next/image";

const DIAMOND_IMAGES = [
  {
    src: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765955875/WhatsApp_Image_2025-12-17_at_9.33.02_AM_cjrrxx.jpg",
    alt: "Changer Fusions team collaborating on career opportunities",
    position: "top",
  },
  {
    src: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1768448265/HighFashionAudition202514_kwly2p.jpg",
    alt: "Fashion and modelling internship opportunity at Changer Fusions",
    position: "left",
  },
  {
    src: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892266/IMG_9928_tv36eu.jpg",
    alt: "Events and marketing jobs experience at Changer Fusions",
    position: "right",
  },
  {
    src: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765955876/WhatsApp_Image_2025-12-17_at_9.32.06_AM_loqhra.jpg",
    alt: "Professional career development support at Changer Fusions Kenya",
    position: "bottom",
  },
] as const;

const POSITION_CLASS: Record<(typeof DIAMOND_IMAGES)[number]["position"], string> = {
  top: "left-1/2 top-[18%] -translate-x-1/2 -translate-y-1/2",
  left: "left-[18%] top-1/2 -translate-x-1/2 -translate-y-1/2",
  right: "left-[82%] top-1/2 -translate-x-1/2 -translate-y-1/2",
  bottom: "left-1/2 top-[82%] -translate-x-1/2 -translate-y-1/2",
};

function DiamondTile({
  src,
  alt,
  position,
  delay,
}: {
  src: string;
  alt: string;
  position: (typeof DIAMOND_IMAGES)[number]["position"];
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
      className={`absolute ${POSITION_CLASS[position]} h-[42%] w-[42%] rotate-45 overflow-hidden border-2 border-white shadow-[0_8px_24px_rgba(10,31,66,0.35)] sm:border-[2.5px]`}
    >
      <div className="absolute left-1/2 top-1/2 h-[145%] w-[145%] -translate-x-1/2 -translate-y-1/2 -rotate-45">
        <Image
          src={src}
          alt={alt}
          fill
          className="object-cover"
          sizes="(max-width: 640px) 140px, 220px"
          priority={position === "top"}
        />
      </div>
    </motion.div>
  );
}

export default function CareersHero() {
  return (
    <section
      className="careers-hero relative mt-16 w-full overflow-hidden sm:mt-20 md:mt-24"
      aria-labelledby="careers-hero-heading"
    >
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(105deg, #0a1f42 0%, #0f2f64 22%, #1e58ca 48%, #1d8a63 78%, #144a36 100%)",
        }}
      />

      <div className="pointer-events-none absolute -left-24 top-0 hidden h-72 w-72 rounded-full bg-primary-400/20 blur-3xl sm:block" />
      <div className="pointer-events-none absolute -right-16 bottom-0 hidden h-80 w-80 rounded-full bg-secondary-400/25 blur-3xl sm:block" />

      <div
        className="pointer-events-none absolute inset-y-0 right-0 hidden w-[42%] opacity-[0.22] sm:block"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.85) 1px, transparent 1px)",
          backgroundSize: "14px 14px",
          maskImage: "linear-gradient(to left, black 35%, transparent 95%)",
          WebkitMaskImage: "linear-gradient(to left, black 35%, transparent 95%)",
        }}
      />

      <div className="relative w-full px-4 sm:px-6 lg:px-8 xl:px-10">
        <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-6 py-10 sm:gap-8 sm:py-14 md:min-h-[400px] md:gap-10 md:py-16 lg:grid-cols-2 lg:gap-8 lg:py-0 lg:min-h-[460px]">
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 order-1 w-full max-w-xl text-white lg:pr-4"
          >
            <h1
              id="careers-hero-heading"
              className="!text-left font-montserrat text-[1.75rem] font-bold leading-tight tracking-tight sm:text-4xl md:text-[2.75rem] lg:text-5xl"
            >
              Careers at Changer Fusions
            </h1>
            <p className="!text-left mt-3 max-w-md text-sm leading-relaxed text-white/90 sm:mt-5 sm:text-base md:text-lg">
              Find out more about the Career Development profession, how it can help you achieve
              your career aspirations or become a sector where you work.
            </p>
          </motion.div>

          <div className="relative order-2 mx-auto flex w-full max-w-[280px] items-center justify-center sm:max-w-[360px] md:max-w-[400px] lg:max-w-none lg:justify-end">
            <div className="relative aspect-square w-full max-w-[280px] sm:max-w-[360px] lg:max-w-[440px] lg:translate-x-4 xl:translate-x-10">
              {DIAMOND_IMAGES.map((tile, index) => (
                <DiamondTile
                  key={tile.position}
                  src={tile.src}
                  alt={tile.alt}
                  position={tile.position}
                  delay={0.15 + index * 0.08}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
