"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

export default function CTABanner() {
  return (
    <section className="section-padding relative overflow-hidden bg-primary-600 text-white">
      <div className="container-custom relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-4xl text-center"
        >
          <h2 className="mb-6 text-4xl font-bold md:text-6xl">
            Fuse Change & Excellence
          </h2>
          <p className="mb-8 text-xl leading-relaxed text-white/90">
            Join thousands of professionals who trust Changer Fusions for transformative event planning,
            strategic marketing solutions, and comprehensive career development. Experience the fusion of innovation and professional excellence.
          </p>

          <div className="flex flex-row flex-wrap items-center justify-center gap-4">
            <Link
              href="/contact"
              className="group inline-flex w-full items-center justify-center rounded-lg bg-white px-8 py-4 font-semibold text-primary-600 shadow-lg transition-all duration-300 hover:bg-gray-100 hover:shadow-xl sm:w-auto"
            >
              Contact Us
              <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="/events"
              className="group inline-flex w-full items-center justify-center rounded-lg border-2 border-white bg-white/10 px-8 py-4 font-semibold text-white backdrop-blur-sm transition-all duration-300 hover:bg-white/20 sm:w-auto"
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
