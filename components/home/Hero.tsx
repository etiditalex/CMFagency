"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

const carouselItems = [
  {
    id: 1,
    title: "2025/2027 BOOTCAMP & GALA AWARDS",
    mission: "Empowering Climate Champions for a Sustainable Future for Africa.",
    image: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892265/IMG_9922_mbb7gc.jpg",
    registerLink: "/events",
    partnerLink: "/contact",
  },
  {
    id: 2,
    title: "CHANGER FUSIONS ENTERPRISE SUMMIT 2025",
    mission: "Market to thrive, Market to exist. Empowering businesses through innovative marketing strategies and transformative solutions.",
    image: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765955875/WhatsApp_Image_2025-12-17_at_9.33.02_AM_cjrrxx.jpg",
    registerLink: "/events",
    partnerLink: "/contact",
  },
  {
    id: 3,
    title: "MARKETING EXCELLENCE AWARDS",
    mission: "Recognizing Innovation and Excellence in Marketing Across Industries.",
    image: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765955876/WhatsApp_Image_2025-12-17_at_9.32.06_AM_loqhra.jpg",
    registerLink: "/events",
    partnerLink: "/contact",
  },
  {
    id: 4,
    title: "AGRICULTURAL SHOW & EXHIBITION",
    mission: "Showcasing Innovation in Agriculture, Livestock, and Agribusiness. Connecting Farmers, Exhibitors, and Industry Leaders for Sustainable Agricultural Development.",
    image: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765955876/WhatsApp_Image_2025-12-17_at_9.31.49_AM_m3hebl.jpg",
    registerLink: "/events",
    partnerLink: "/contact",
  },
  {
    id: 5,
    title: "CHANGER FUSIONS ENTERPRISES",
    mission: "Market to thrive, Market to exist. Empowering businesses through innovative marketing strategies and transformative solutions.",
    image: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765955877/WhatsApp_Image_2025-12-17_at_9.32.55_AM_pbzaj5.jpg",
    registerLink: "/events",
    partnerLink: "/contact",
  },
];

export default function Hero() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setDirection(1);
      setCurrentIndex((prev) => (prev + 1) % carouselItems.length);
    }, 5000);

    return () => clearInterval(timer);
  }, []);

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 1000 : -1000,
      opacity: 0,
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 1000 : -1000,
      opacity: 0,
    }),
  };

  const swipeConfidenceThreshold = 10000;
  const swipePower = (offset: number, velocity: number) => {
    return Math.abs(offset) * velocity;
  };

  const paginate = (newDirection: number) => {
    setDirection(newDirection);
    if (newDirection === 1) {
      setCurrentIndex((prev) => (prev + 1) % carouselItems.length);
    } else {
      setCurrentIndex((prev) => (prev - 1 + carouselItems.length) % carouselItems.length);
    }
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
      {/* Carousel Container */}
      <div className="relative w-full h-screen">
        <AnimatePresence initial={false} custom={direction} mode="wait">
          <motion.div
            key={currentIndex}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: "spring", stiffness: 300, damping: 30 },
              opacity: { duration: 0.2 },
            }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={1}
            onDragEnd={(e, { offset, velocity }) => {
              const swipe = swipePower(offset.x, velocity.x);

              if (swipe < -swipeConfidenceThreshold) {
                paginate(1);
              } else if (swipe > swipeConfidenceThreshold) {
                paginate(-1);
              }
            }}
            className="absolute inset-0"
          >
            {/* Background Image */}
            <div className="absolute inset-0">
              <Image
                src={carouselItems[currentIndex].image}
                alt={carouselItems[currentIndex].title}
                fill
                className="object-cover"
                priority={currentIndex === 0}
              />
              {/* Overlay with website colors */}
              <div className="absolute inset-0 bg-gradient-to-r from-primary-900/80 via-secondary-800/70 to-primary-900/80"></div>
            </div>

            {/* Content Overlay */}
            <div className="relative z-10 h-full flex items-center">
              <div className="container-custom w-full">
                <div className="max-w-2xl">
                  {/* Tagline */}
                  <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.1 }}
                    className="mb-4"
                  >
                    <span className="inline-flex items-center space-x-2 bg-white/20 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm font-semibold">
                      <span>Changer Fusions Enterprises</span>
                    </span>
                  </motion.div>

                  {/* Title */}
                  <motion.h1
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight text-left"
                  >
                    {carouselItems[currentIndex].title}
                  </motion.h1>

                  {/* Mission Statement */}
                  <motion.p
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.4 }}
                    className="text-xl md:text-2xl text-white/95 mb-8 italic font-light"
                  >
                    {carouselItems[currentIndex].mission}
                  </motion.p>

                  {/* Action Buttons */}
                  <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.6 }}
                    className="flex flex-col sm:flex-row gap-4"
                  >
                    <Link
                      href={carouselItems[currentIndex].registerLink}
                      className="inline-flex items-center justify-center space-x-2 bg-white text-primary-600 hover:bg-gray-100 font-semibold py-4 px-8 rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl group"
                    >
                      <CheckCircle className="w-5 h-5 text-primary-600" />
                      <span>Register today</span>
                    </Link>
                    <Link
                      href={carouselItems[currentIndex].partnerLink}
                      className="inline-flex items-center justify-center space-x-2 bg-white text-primary-600 hover:bg-gray-100 font-semibold py-4 px-8 rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl group"
                    >
                      <ArrowRight className="w-5 h-5 text-primary-600" />
                      <span>Partner with us</span>
                    </Link>
                  </motion.div>
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Navigation Arrows */}
        <button
          onClick={() => paginate(-1)}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-20 bg-white/20 hover:bg-white/30 backdrop-blur-sm p-3 rounded-full transition-all duration-300 group"
          aria-label="Previous slide"
        >
          <ChevronLeft className="w-6 h-6 text-white group-hover:text-primary-200" />
        </button>
        <button
          onClick={() => paginate(1)}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-20 bg-white/20 hover:bg-white/30 backdrop-blur-sm p-3 rounded-full transition-all duration-300 group"
          aria-label="Next slide"
        >
          <ChevronRight className="w-6 h-6 text-white group-hover:text-primary-200" />
        </button>

        {/* Carousel Indicators */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex space-x-2">
          {carouselItems.map((_, index) => (
            <button
              key={index}
              onClick={() => {
                setDirection(index > currentIndex ? 1 : -1);
                setCurrentIndex(index);
              }}
              className={`h-3 rounded-full transition-all duration-300 ${
                index === currentIndex
                  ? "w-8 bg-white"
                  : "w-3 bg-white/50 hover:bg-white/75"
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
