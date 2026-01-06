"use client";

import { motion } from "framer-motion";
import { MapPin, Calendar } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export default function JobsPage() {
  return (
    <div className="pt-20 min-h-screen bg-gray-50">
      <section className="section-padding">
        <div className="container-custom">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h1 className="text-4xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
              Job Board
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Find exciting career opportunities with Changer Fusions and our partners
            </p>
          </motion.div>

          {/* Advertisement */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mb-8 bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200"
          >
            <div className="flex flex-col md:flex-row">
              {/* Image Section */}
              <div className="relative w-full md:w-1/2 min-h-[300px] md:min-h-[400px] bg-gray-100 flex items-center justify-center">
                <Image
                  src="https://res.cloudinary.com/dyfnobo9r/image/upload/v1767691548/opportunity_dzeqxh.jpg"
                  alt="Career Opportunity Advertisement"
                  width={800}
                  height={600}
                  className="w-full h-full object-contain"
                  priority
                />
              </div>
              {/* Content Section */}
              <div className="w-full md:w-1/2 p-6 md:p-8 flex flex-col justify-center">
                <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
                  Career Opportunities
                </h3>
                <div className="space-y-3 mb-4">
                  <div className="flex items-center text-gray-600">
                    <Calendar className="w-5 h-5 mr-3 text-primary-600 flex-shrink-0" />
                    <span>Multiple positions available</span>
                  </div>
                  <div className="flex items-center text-gray-600">
                    <MapPin className="w-5 h-5 mr-3 text-primary-600 flex-shrink-0" />
                    <span>Various locations</span>
                  </div>
                </div>
                <p className="text-gray-700 mb-4 leading-relaxed">
                  Explore exciting career opportunities with Changer Fusions. Join our team and be part of creating impactful experiences and innovative solutions.
                </p>
                <Link
                  href="/jobs/apply"
                  className="inline-block mt-4 px-6 py-3 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition-colors duration-200 text-center"
                >
                  Get In Touch
                </Link>
              </div>
            </div>
          </motion.div>

        </div>
      </section>
    </div>
  );
}

