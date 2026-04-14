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
    enter: {
      opacity: 0,
    },
    center: {
      opacity: 1,
    },
    exit: {
      opacity: 0,
    },
  };

  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden pt-20">
      {/* Carousel Container */}
      <div className="relative h-screen w-full">
        <AnimatePresence initial={false} mode="sync">
          <motion.div
            key={currentIndex}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              opacity: { duration: 0.22, ease: "linear" },
            }}
            className="absolute inset-0"
          >
            {/* Background Image */}
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
              {/* Dark overlay for better text readability */}
              <div className="absolute inset-0 bg-black/60"></div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Static Content Overlay - Always visible */}
        <div className="relative z-10 flex h-full items-center">
          <div className="container-custom w-full">
            <div className="max-w-3xl">
              {/* Title */}
              <motion.h1
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="mb-5 max-w-2xl text-left text-4xl font-bold leading-[1.04] tracking-tight text-white drop-shadow-2xl md:text-6xl lg:text-7xl"
              >
                Strategic Marketing That Powers Growth and Relevance
              </motion.h1>

              {/* Description */}
              <motion.p
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="mb-8 max-w-xl text-lg leading-relaxed text-white/95 drop-shadow-lg md:text-2xl"
              >
                Market to thrive, Market to exit
              </motion.p>

              {/* Action Buttons */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.6 }}
                className="flex flex-row gap-3 sm:gap-4"
              >
                <Link
                  href="/events"
                  className="group inline-flex flex-1 items-center justify-center whitespace-nowrap space-x-2 rounded-lg bg-white px-4 py-3 text-sm font-semibold text-primary-700 shadow-lg transition-all duration-300 hover:-translate-y-0.5 hover:bg-gray-100 hover:shadow-xl sm:flex-none sm:px-8 sm:py-4 sm:text-base"
                >
                  <Calendar className="w-5 h-5 text-primary-600" />
                  <span>Planning an event?</span>
                </Link>
                <Link
                  href="/contact"
                  className="group inline-flex flex-1 items-center justify-center whitespace-nowrap space-x-2 rounded-lg border border-white/45 bg-white/10 px-4 py-3 text-sm font-semibold text-white shadow-lg backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/20 hover:shadow-xl sm:flex-none sm:px-8 sm:py-4 sm:text-base"
                >
                  <Handshake className="h-5 w-5 text-white" />
                  <span>Partner with Us</span>
                </Link>
              </motion.div>
            </div>
          </div>
        </div>

        {/* Carousel Indicators */}
        <div className="absolute bottom-8 left-1/2 z-20 flex -translate-x-1/2 space-x-2">
          {carouselItems.map((_, index) => (
            <button
              key={index}
              onClick={() => {
                setCurrentIndex(index);
              }}
              className={`h-2.5 rounded-full transition-all duration-300 ${
                index === currentIndex
                  ? "w-8 bg-white"
                  : "w-2.5 bg-white/45 hover:bg-white/70"
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
