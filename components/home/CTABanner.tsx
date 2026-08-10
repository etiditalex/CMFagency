"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

export default function CTABanner() {
  return (
    <section className="relative overflow-hidden bg-primary-600 py-10 text-white sm:py-14 md:py-20">
      <div className="container-custom relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-4xl text-center"
        >
          <h2 className="mb-4 text-2xl font-bold sm:mb-6 sm:text-4xl md:text-5xl lg:text-6xl">
            Fuse Change & Excellence
          </h2>
          <p className="mb-6 text-base leading-relaxed text-white/90 sm:mb-8 sm:text-lg md:text-xl">
            Join thousands of professionals who trust Changer Fusions for transformative event planning,
            strategic marketing solutions, and comprehensive career development. Experience the fusion of
            innovation and professional excellence.
          </p>

          <div className="flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
            <Link
              href="/contact"
              className="group inline-flex min-h-[48px] w-full items-center justify-center rounded-lg bg-white px-6 py-3.5 font-semibold text-primary-600 shadow-lg transition-all duration-300 hover:bg-gray-100 hover:shadow-xl sm:w-auto sm:px-8 sm:py-4"
            >
              Contact Us
              <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="/events"
              className="group inline-flex min-h-[48px] w-full items-center justify-center rounded-lg border-2 border-white bg-white/10 px-6 py-3.5 font-semibold text-white backdrop-blur-sm transition-all duration-300 hover:bg-white/20 sm:w-auto sm:px-8 sm:py-4"
            >
              Explore Events
              <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
