"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import {
  FALLBACK_TESTIMONIALS_PAGE,
  isMissingTestimonialsTable,
  TESTIMONIAL_PUBLIC_SELECT,
  testimonialInitials,
} from "@/lib/testimonials";

type PageTestimonial = {
  id: number;
  name: string;
  role: string;
  quote: string;
  image_url: string;
  rating: number | null;
};

export default function TestimonialsPage() {
  const [testimonials, setTestimonials] = useState<PageTestimonial[]>(FALLBACK_TESTIMONIALS_PAGE);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const { data, error } = await supabase
          .from("testimonials")
          .select(TESTIMONIAL_PUBLIC_SELECT)
          .eq("is_active", true)
          .eq("show_on_testimonials_page", true)
          .order("sort_order", { ascending: true })
          .order("id", { ascending: false });
        if (error) throw error;
        if (cancelled) return;
        setTestimonials((data ?? []) as PageTestimonial[]);
        setCurrentIndex(0);
      } catch (error) {
        if (!cancelled && !isMissingTestimonialsTable(error as { message?: string; code?: string })) {
          setTestimonials(FALLBACK_TESTIMONIALS_PAGE);
        }
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (testimonials.length <= 1) return undefined;
    const timer = setInterval(() => {
      setDirection(1);
      setCurrentIndex((prev) => (prev + 1) % testimonials.length);
    }, 6000);

    return () => clearInterval(timer);
  }, [testimonials.length]);

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

  const paginate = (newDirection: number) => {
    if (testimonials.length === 0) return;
    setDirection(newDirection);
    if (newDirection === 1) {
      setCurrentIndex((prev) => (prev + 1) % testimonials.length);
    } else {
      setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
    }
  };

  const currentTestimonial = testimonials[currentIndex];
  const rating = currentTestimonial?.rating ?? 5;

  return (
    <div className="pt-20 min-h-screen">
      {/* Testimonials Carousel Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0">
          <div
            className="w-full h-full bg-cover bg-center"
            style={{
              backgroundImage:
                "url(https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892263/IMG_9856_x8kq7w.jpg)",
            }}
          >
            {/* Dark overlay for better text readability */}
            <div className="absolute inset-0 bg-black/70"></div>
          </div>
        </div>

        {/* Content Overlay */}
        <div className="container-custom relative z-10 py-20">
          {/* Title */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-8 md:mb-12 px-4"
          >
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white uppercase tracking-wide mb-4 md:mb-6 drop-shadow-lg">
              Testimonials
            </h1>
            
            {/* Navigation Dots */}
            {testimonials.length > 1 ? (
              <div className="flex items-center justify-center space-x-3 mb-8">
                {testimonials.map((item, index) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setDirection(index > currentIndex ? 1 : -1);
                      setCurrentIndex(index);
                    }}
                    className={`transition-all duration-300 ${
                      index === currentIndex
                        ? "w-8 h-1 bg-white"
                        : "w-1 h-1 bg-white/50 rounded-full hover:bg-white/75"
                    }`}
                    aria-label={`Go to testimonial ${index + 1}`}
                  />
                ))}
              </div>
            ) : null}
          </motion.div>

          {/* Testimonial Carousel */}
          <div className="relative max-w-6xl mx-auto">
            {!currentTestimonial ? (
              <p className="text-center text-white/80 text-lg">Published testimonials will appear here.</p>
            ) : (
              <AnimatePresence initial={false} custom={direction} mode="wait">
                <motion.div
                  key={currentTestimonial.id}
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{
                    x: { type: "spring", stiffness: 300, damping: 30 },
                    opacity: { duration: 0.2 },
                  }}
                  className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8 items-center px-4"
                >
                  {/* Profile Picture */}
                  <div className="flex justify-center lg:justify-start">
                    <div className="relative w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-full overflow-hidden border-4 border-white/40 shadow-2xl bg-white/10">
                      {currentTestimonial.image_url ? (
                        <Image
                          src={currentTestimonial.image_url}
                          alt={currentTestimonial.name}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-white">
                          {testimonialInitials(currentTestimonial.name)}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Testimonial Content */}
                  <div className="lg:col-span-2 space-y-3 md:space-y-4">
                    {/* Star Rating */}
                    <div className="flex items-center space-x-1 mb-4">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-6 h-6 ${
                            i < Math.floor(rating)
                              ? "fill-yellow-400 text-yellow-400"
                              : i < rating
                              ? "fill-yellow-400/50 text-yellow-400"
                              : "text-white/30"
                          }`}
                        />
                      ))}
                    </div>

                    {/* Quote */}
                    <div className="relative">
                      <span className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-serif text-white/25 absolute -left-2 sm:-left-4 -top-2 sm:-top-4 leading-none">
                        "
                      </span>
                      <p className="text-white text-base sm:text-lg md:text-xl leading-relaxed pl-6 sm:pl-8 pr-2 sm:pr-4 relative z-10 drop-shadow-md">
                        {currentTestimonial.quote}
                      </p>
                      <span className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-serif text-white/25 absolute -right-2 sm:-right-4 -bottom-6 sm:-bottom-8 leading-none">
                        "
                      </span>
                    </div>

                    {/* Attribution */}
                    <div className="pt-3 md:pt-4">
                      <p className="text-white text-lg sm:text-xl font-semibold drop-shadow-md">{currentTestimonial.name}</p>
                      <p className="text-white text-base sm:text-lg drop-shadow-md">{currentTestimonial.role}</p>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            )}

            {/* Navigation Arrows */}
            {testimonials.length > 1 ? (
              <>
                <button
                  onClick={() => paginate(-1)}
                  className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 sm:-translate-x-4 lg:-translate-x-12 bg-white/25 hover:bg-white/40 backdrop-blur-md p-2 sm:p-3 rounded-full transition-all duration-300 z-20 group shadow-lg"
                  aria-label="Previous testimonial"
                >
                  <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6 text-white group-hover:scale-110 transition-transform" />
                </button>
                <button
                  onClick={() => paginate(1)}
                  className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 sm:translate-x-4 lg:translate-x-12 bg-white/25 hover:bg-white/40 backdrop-blur-md p-2 sm:p-3 rounded-full transition-all duration-300 z-20 group shadow-lg"
                  aria-label="Next testimonial"
                >
                  <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 text-white group-hover:scale-110 transition-transform" />
                </button>
              </>
            ) : null}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="section-padding bg-gradient-to-r from-primary-600 via-secondary-600 to-primary-600">
        <div className="container-custom">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-3xl mx-auto"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Ready to Fuse Change & Excellence?
            </h2>
            <p className="text-xl text-white mb-8 drop-shadow-lg">
              Let's work together to create transformative success stories. Contact Changer Fusions today to experience the fusion of innovation and professional excellence.
            </p>
            <a
              href="/contact"
              className="inline-block bg-white text-primary-600 hover:bg-gray-100 font-semibold py-4 px-8 rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              Get In Touch
            </a>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
