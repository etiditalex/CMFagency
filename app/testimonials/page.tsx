"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";

const testimonials = [
  {
    id: 1,
    name: "Haron Waswa",
    role: "Mr. Climate Kenya 2023-2025",
    image: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892256/IMG_0331_zz7s2k.jpg",
    rating: 4.5,
    quote: "Haron Waswa is the Flag Carrier for Mr. Climate Kenya 2023–2025 and also crowned Mr. Cambridge University. He is the former Mr. Rectified Eldoret, and currently the Mr. Kitenge Fashion Fest, a prestigious platform that showcases authentic cultural fabrics in fashion. He is Passionate, visionary, and committed, I continue to stand at the frontline of climate advocacy, community empowerment, and sustainable development.",
  },
  {
    id: 2,
    name: "Sarah Johnson",
    role: "CEO, TechCorp Inc.",
    image: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892261/IMG_9817_qlxozr.jpg",
    rating: 5,
    quote: "Changer Fusions Enterprises transformed our event planning process. Their attention to detail and creative approach made our annual conference a huge success. The team's professionalism and dedication to excellence is unmatched. Highly recommended!",
  },
  {
    id: 3,
    name: "Michael Chen",
    role: "Marketing Director, GreenLife",
    image: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892256/IMG_0331_zz7s2k.jpg",
    rating: 5,
    quote: "Working with Changer Fusions Enterprises has been a game-changer for our brand. Their marketing strategies and portfolio of work speak for themselves. They understand our vision and deliver exceptional results every time.",
  },
  {
    id: 4,
    name: "Emily Rodriguez",
    role: "Event Coordinator, EventPro",
    image: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892255/IMG_0320_xc3kuq.jpg",
    rating: 4.5,
    quote: "The team at Changer Fusions Enterprises is professional, creative, and always delivers on time. They've helped us execute multiple successful events with seamless planning. Their expertise in event management is truly remarkable.",
  },
  {
    id: 5,
    name: "David Thompson",
    role: "Founder, StartupHub",
    image: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892258/IMG_0373_e07xid.jpg",
    rating: 5,
    quote: "Changer Fusions Enterprises' comprehensive approach to marketing and event planning helped us establish our brand in the market. Their expertise is unmatched, and they truly care about their clients' success.",
  },
];

export default function TestimonialsPage() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setDirection(1);
      setCurrentIndex((prev) => (prev + 1) % testimonials.length);
    }, 6000);

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

  const paginate = (newDirection: number) => {
    setDirection(newDirection);
    if (newDirection === 1) {
      setCurrentIndex((prev) => (prev + 1) % testimonials.length);
    } else {
      setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
    }
  };

  const currentTestimonial = testimonials[currentIndex];

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
            {/* Dark Overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-primary-900/90 via-secondary-800/85 to-primary-900/90 backdrop-blur-sm"></div>
          </div>
        </div>

        {/* Content Overlay */}
        <div className="container-custom relative z-10 py-20">
          {/* Title */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h1 className="text-5xl md:text-7xl font-bold text-white uppercase tracking-wide mb-6">
              Testimonials
            </h1>
            
            {/* Navigation Dots */}
            <div className="flex items-center justify-center space-x-3 mb-8">
              {testimonials.map((_, index) => (
                <button
                  key={index}
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
          </motion.div>

          {/* Testimonial Carousel */}
          <div className="relative max-w-6xl mx-auto">
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
                className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center"
              >
                {/* Profile Picture */}
                <div className="flex justify-center lg:justify-start">
                  <div className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-white/30 shadow-2xl">
                    <Image
                      src={currentTestimonial.image}
                      alt={currentTestimonial.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                </div>

                {/* Testimonial Content */}
                <div className="lg:col-span-2 space-y-4">
                  {/* Star Rating */}
                  <div className="flex items-center space-x-1 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-6 h-6 ${
                          i < Math.floor(currentTestimonial.rating)
                            ? "fill-yellow-400 text-yellow-400"
                            : i < currentTestimonial.rating
                            ? "fill-yellow-400/50 text-yellow-400"
                            : "text-white/30"
                        }`}
                      />
                    ))}
                  </div>

                  {/* Quote */}
                  <div className="relative">
                    <span className="text-8xl md:text-9xl font-serif text-white/20 absolute -left-4 -top-4 leading-none">
                      "
                    </span>
                    <p className="text-white text-lg md:text-xl leading-relaxed pl-8 pr-4 relative z-10">
                      {currentTestimonial.quote}
                    </p>
                    <span className="text-8xl md:text-9xl font-serif text-white/20 absolute -right-4 -bottom-8 leading-none">
                      "
                    </span>
                  </div>

                  {/* Attribution */}
                  <div className="pt-4">
                    <p className="text-white text-xl font-semibold">{currentTestimonial.name}</p>
                    <p className="text-white/80 text-lg">{currentTestimonial.role}</p>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Navigation Arrows */}
            <button
              onClick={() => paginate(-1)}
              className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 lg:-translate-x-12 bg-white/20 hover:bg-white/30 backdrop-blur-sm p-3 rounded-full transition-all duration-300 z-20 group"
              aria-label="Previous testimonial"
            >
              <ChevronLeft className="w-6 h-6 text-white group-hover:text-primary-200" />
            </button>
            <button
              onClick={() => paginate(1)}
              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 lg:translate-x-12 bg-white/20 hover:bg-white/30 backdrop-blur-sm p-3 rounded-full transition-all duration-300 z-20 group"
              aria-label="Next testimonial"
            >
              <ChevronRight className="w-6 h-6 text-white group-hover:text-primary-200" />
            </button>
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
            <p className="text-xl text-white/90 mb-8">
              Let's work together to create transformative success stories. Contact Changer Fusions Enterprises today to experience the fusion of innovation and enterprise excellence.
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
