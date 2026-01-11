"use client";

import { motion } from "framer-motion";
import { Briefcase, MapPin, Clock, Users, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function EventsOpportunitiesPage() {
  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      <section className="section-padding bg-white">
        <div className="container-custom">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Events Opportunities - Jobs
            </h1>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Explore exciting events job opportunities at CMF Agency
            </p>
          </motion.div>

          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-lg shadow-lg p-8 border border-gray-200">
              <p className="text-gray-700 text-center">
                Events job opportunities are coming soon. Check back regularly for updates.
              </p>
              <div className="mt-8 text-center">
                <Link
                  href="/careers"
                  className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 font-semibold"
                >
                  <ArrowRight className="w-4 h-4 rotate-180" />
                  Back to Careers
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
