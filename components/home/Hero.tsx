"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, Handshake } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { cloudinaryLoader } from "@/lib/cloudinary";

const carouselItems = [
  {
    id: 1,
    image: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892265/IMG_9922_mbb7gc.jpg",
    alt: "Marketing and Events",
  },
  {
    id: 2,
    image: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765955875/WhatsApp_Image_2025-12-17_at_9.33.02_AM_cjrrxx.jpg",
    alt: "Business Growth",
  },
  {
    id: 3,
    image: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765955876/WhatsApp_Image_2025-12-17_at_9.32.06_AM_loqhra.jpg",
    alt: "Marketing Excellence",
  },
  {
    id: 4,
    image: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765955876/WhatsApp_Image_2025-12-17_at_9.31.49_AM_m3hebl.jpg",
    alt: "Events and Exhibitions",
  },
  {
    id: 5,
    image: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765955877/WhatsApp_Image_2025-12-17_at_9.32.55_AM_pbzaj5.jpg",
    alt: "Strategic Marketing",
  },
];

export default function Hero() {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % carouselItems.length);
    }, 5000);

    return () => clearInterval(timer);
  }, []);

  const slideVariants = {
    enter: { opacity: 0 },
    center: { opacity: 1 },
    exit: { opacity: 0 },
  };

  return (
    <section
      className="relative flex min-h-[70svh] items-center justify-center overflow-hidden pt-28 sm:pt-32 md:pt-36"
      aria-labelledby="home-hero-heading"
    >
      <div className="relative min-h-[70svh] w-full">
        <AnimatePresence initial={false} mode="sync">
          <motion.div
            key={currentIndex}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ opacity: { duration: 0.22, ease: "linear" } }}
            className="absolute inset-0"
          >
            <div className="absolute inset-0">
              <Image
                loader={cloudinaryLoader}
                src={carouselItems[currentIndex].image}
                alt={carouselItems[currentIndex].alt}
                fill
                className="object-cover"
                priority={currentIndex === 0}
                fetchPriority={currentIndex === 0 ? "high" : undefined}
                sizes="100vw"
              />
              <div className="absolute inset-0 bg-black/60" />
            </div>
          </motion.div>
        </AnimatePresence>

        <div className="relative z-10 flex h-full min-h-[70svh] items-center py-10 sm:py-12">
          <div className="container-custom w-full">
            <div className="max-w-3xl min-w-0">
              <motion.h1
                id="home-hero-heading"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.15 }}
                className="mb-3 max-w-2xl text-left text-[1.65rem] font-bold leading-[1.12] tracking-tight text-white drop-shadow-2xl sm:mb-5 sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl"
              >
                Strategic Marketing That Powers Growth and Relevance
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.28 }}
                className="mb-6 max-w-xl text-base leading-relaxed text-white/95 drop-shadow-lg sm:mb-8 sm:text-lg md:text-2xl"
              >
                Market to thrive, Market to exist
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.4 }}
                className="flex w-full flex-row gap-3 sm:w-auto sm:gap-4"
              >
                <Link
                  href="/events"
                  className="group inline-flex min-h-[48px] w-full min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg bg-white px-2 py-3 text-center text-xs font-semibold text-primary-700 shadow-lg transition-all duration-300 hover:-translate-y-0.5 hover:bg-gray-100 hover:shadow-xl sm:w-auto sm:flex-none sm:gap-2 sm:px-8 sm:py-3.5 sm:text-base sm:whitespace-nowrap"
                >
                  <Calendar className="h-4 w-4 shrink-0 text-primary-600 sm:h-5 sm:w-5" aria-hidden />
                  <span>Planning an event?</span>
                </Link>
                <Link
                  href="/contact"
                  className="group inline-flex min-h-[48px] w-full min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg border border-white/45 bg-white/10 px-2 py-3 text-center text-xs font-semibold text-white shadow-lg backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/20 hover:shadow-xl sm:w-auto sm:flex-none sm:gap-2 sm:px-8 sm:py-3.5 sm:text-base sm:whitespace-nowrap"
                >
                  <Handshake className="h-4 w-4 shrink-0 text-white sm:h-5 sm:w-5" aria-hidden />
                  <span>Partner with Us</span>
                </Link>
              </motion.div>
            </div>
          </div>
        </div>

        <div className="absolute bottom-5 left-1/2 z-20 flex -translate-x-1/2 space-x-2 sm:bottom-8">
          {carouselItems.map((_, index) => (
            <button
              key={index}
              type="button"
              onClick={() => setCurrentIndex(index)}
              className={`h-2.5 rounded-full transition-all duration-300 ${
                index === currentIndex ? "w-8 bg-white" : "w-2.5 bg-white/45 hover:bg-white/70"
              }`}
              aria-current={index === currentIndex ? "true" : "false"}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
