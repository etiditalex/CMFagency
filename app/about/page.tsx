"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, ChevronRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

const carouselImages = [
  "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765955875/WhatsApp_Image_2025-12-17_at_9.33.02_AM_cjrrxx.jpg",
  "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765955876/WhatsApp_Image_2025-12-17_at_9.32.06_AM_loqhra.jpg",
  "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765955876/WhatsApp_Image_2025-12-17_at_9.31.49_AM_m3hebl.jpg",
  "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765955877/WhatsApp_Image_2025-12-17_at_9.32.55_AM_pbzaj5.jpg",
];

export default function AboutPage() {
  const images = useMemo(() => carouselImages, []);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const t = window.setInterval(() => setIndex((p) => (p + 1) % images.length), 5000);
    return () => window.clearInterval(t);
  }, [images.length]);

  return (
    <div className="pt-28 md:pt-32 min-h-screen bg-gray-50">
      <div className="container-custom py-10">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
          {/* Main content (left) */}
          <main className="lg:col-span-3">
            {/* Carousel */}
            <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="relative aspect-[16/7] min-h-[260px]">
                <AnimatePresence initial={false} mode="wait">
                  <motion.div
                    key={index}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.35 }}
                    className="absolute inset-0"
                  >
                    <Image
                      src={images[index]}
                      alt="About Changer Fusions"
                      fill
                      className="object-cover object-center"
                      priority={index === 0}
                      sizes="(max-width: 1024px) 100vw, 900px"
                    />
                    <div className="absolute inset-0 bg-black/15" />
                  </motion.div>
                </AnimatePresence>

                {/* Hover overlay */}
                <div className="absolute inset-0 group">
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/45 transition-colors duration-300" />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <Link
                      href="/services"
                      className="inline-flex items-center gap-2 rounded-lg bg-white text-primary-700 font-bold px-6 py-3 shadow-lg"
                    >
                      Read more
                      <span className="inline-flex items-center gap-2 text-sm font-semibold text-gray-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-secondary-500" />
                        Services
                      </span>
                    </Link>
                  </div>
                </div>

                {/* Dots */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                  {images.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setIndex(i)}
                      className={`h-2.5 rounded-full transition-all ${
                        i === index ? "w-8 bg-white" : "w-2.5 bg-white/60 hover:bg-white/80"
                      }`}
                      aria-label={`Go to slide ${i + 1}`}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="mt-10 space-y-10">
              <section>
                <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-wide">ABOUT US</h1>
                <div className="mt-4 text-gray-700 leading-relaxed space-y-4">
                  <p>
                    Changer Fusions is a forward-thinking marketing strategic partner specializing in blending innovative marketing
                    techniques, cutting-edge technologies, and transformative strategies to create impactful and tailored solutions for clients.
                  </p>
                  <p>
                    With a focus on harnessing the power of change and innovation, we drive meaningful results and facilitate growth in an
                    ever-evolving marketing landscape.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-xl md:text-2xl font-extrabold text-gray-900 tracking-wide">OUR HISTORY</h2>
                <p className="mt-4 text-gray-700 leading-relaxed">
                  Built from a passion for strategic marketing and execution excellence, Changer Fusions has grown into a trusted partner for
                  businesses, institutions, and event brands across Kenya—helping them increase visibility, strengthen brand presence, and
                  deliver memorable experiences.
                </p>
              </section>

              <section>
                <h2 className="text-xl md:text-2xl font-extrabold text-gray-900 tracking-wide">WHY CHANGER FUSIONS</h2>
                <p className="mt-4 text-gray-700 leading-relaxed">
                  We combine research, creativity, and modern digital tools to produce marketing that is measurable, consistent, and designed to
                  grow your business. We don’t just market—we build momentum.
                </p>
              </section>

              {/* CTA Banner (screenshot-style) */}
              <section className="rounded-xl overflow-hidden border border-primary-700/20 shadow-sm">
                <div className="bg-primary-600">
                  <div className="flex flex-col md:flex-row items-center justify-between gap-5 px-6 md:px-10 py-8">
                    <div className="text-white text-xl md:text-2xl font-bold">
                      Looking to advance your skills?
                    </div>
                    <Link
                      href="/training"
                      className="inline-flex items-center justify-center bg-white text-gray-900 font-bold px-10 py-4 rounded-md shadow-md hover:bg-gray-100 transition-colors"
                    >
                      Register Now
                    </Link>
                  </div>
                </div>
              </section>
            </div>
          </main>

          {/* Sidebar (right) */}
          <aside className="lg:col-span-1">
            <div className="bg-white border-2 border-secondary-600 rounded-lg p-6 sticky top-24">
              <h2 className="text-xl font-bold text-gray-900 mb-6">ABOUT</h2>
              <nav className="space-y-2">
                <div className="block text-secondary-600 font-semibold flex items-center space-x-2">
                  <ChevronRight className="w-4 h-4" />
                  <span>ABOUT US</span>
                </div>
                <Link
                  href="/about/team"
                  className="block text-gray-700 hover:text-secondary-600 transition-colors duration-200 flex items-center space-x-2"
                >
                  <ChevronRight className="w-4 h-4" />
                  <span>OUR TEAM</span>
                </Link>
                <Link
                  href="/about/partners"
                  className="block text-gray-700 hover:text-secondary-600 transition-colors duration-200 flex items-center space-x-2"
                >
                  <ChevronRight className="w-4 h-4" />
                  <span>PARTNERS</span>
                </Link>
                <Link
                  href="/services"
                  className="block text-gray-700 hover:text-secondary-600 transition-colors duration-200 flex items-center space-x-2"
                >
                  <ChevronRight className="w-4 h-4" />
                  <span>SERVICES</span>
                </Link>
              </nav>

              <div className="mt-8 pt-8 border-t border-gray-200 space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-3">OUR VISION</h3>
                  <p className="text-gray-700 text-sm leading-relaxed">
                    To make marketing the force behind business in Kenya and beyond.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-3">OUR MISSION</h3>
                  <p className="text-gray-700 text-sm leading-relaxed">
                    To deliver innovative, impactful marketing solutions that drive business growth and create lasting value for our clients and communities.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-3">CORE VALUES</h3>
                  <ul className="space-y-3">
                    {[
                      "Innovation",
                      "Integrity",
                      "Excellence",
                      "Client-Centricity",
                      "Impact & Results",
                    ].map((v) => (
                      <li key={v} className="flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 text-secondary-600 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700 text-sm leading-relaxed">{v}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
