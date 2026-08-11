"use client";

import { motion } from "framer-motion";
import Image from "next/image";

const HERO_IMAGE =
  "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765955875/WhatsApp_Image_2025-12-17_at_9.33.02_AM_cjrrxx.jpg";

export default function CareersHero() {
  return (
    <section
      className="careers-hero w-full bg-white pt-28 sm:pt-32 md:pt-36"
      aria-labelledby="careers-hero-heading"
    >
      <div className="relative overflow-hidden rounded-tl-[3.5rem] bg-primary-600 sm:rounded-tl-[5.5rem] md:rounded-tl-[7rem] lg:rounded-tl-[9rem]">
        <div className="grid min-h-[420px] grid-cols-1 lg:min-h-[520px] lg:grid-cols-2 xl:min-h-[560px]">
          {/* Text panel */}
          <div className="relative z-10 flex items-center bg-primary-600 px-6 py-12 sm:px-10 sm:py-14 md:px-14 md:py-16 lg:px-16 lg:py-20 xl:px-20">
            <span
              aria-hidden
              className="pointer-events-none absolute left-0 top-1/2 -translate-y-[55%] select-none font-montserrat text-[4.5rem] font-bold uppercase leading-none tracking-tight text-white/[0.07] sm:text-[6.5rem] md:text-[8rem] lg:text-[9rem] xl:text-[10.5rem]"
            >
              Careers
            </span>

            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              className="relative w-full max-w-xl"
            >
              <div
                className="mb-5 h-1.5 w-14 rounded-sm bg-secondary-400 sm:mb-6 sm:h-2 sm:w-16"
                aria-hidden
              />
              <h1
                id="careers-hero-heading"
                className="!text-left font-montserrat text-[1.75rem] font-bold leading-[1.12] tracking-tight text-white sm:text-4xl md:text-[2.75rem] lg:text-5xl"
              >
                Career Development
              </h1>
              <p className="!text-left mt-4 max-w-md text-sm leading-relaxed text-white/95 sm:mt-5 sm:text-base md:text-lg md:leading-[1.7]">
                Find out more about the Career Development profession, how it can help you achieve
                your career aspirations or become a sector where you work.
              </p>
            </motion.div>
          </div>

          {/* Image panel */}
          <div className="relative min-h-[240px] sm:min-h-[300px] lg:min-h-full">
            <Image
              src={HERO_IMAGE}
              alt="Professionals collaborating on career development at Changer Fusions"
              fill
              priority
              className="object-cover object-center"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
            {/* Cool primary tint + left blend into the blue panel */}
            <div className="absolute inset-0 bg-primary-700/25 mix-blend-multiply" aria-hidden />
            <div
              className="absolute inset-y-0 left-0 hidden w-28 bg-gradient-to-r from-primary-600 via-primary-600/70 to-transparent lg:block xl:w-36"
              aria-hidden
            />
            <div
              className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-primary-600/80 to-transparent lg:hidden"
              aria-hidden
            />
          </div>
        </div>
      </div>
    </section>
  );
}
