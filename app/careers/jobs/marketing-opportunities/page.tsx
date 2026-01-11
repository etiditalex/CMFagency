"use client";

import { motion } from "framer-motion";
import { ArrowLeft, CheckCircle, Mail, Phone } from "lucide-react";
import Link from "next/link";

export default function JobsMarketingOpportunitiesPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <section className="relative bg-gradient-to-br from-accent-600 via-accent-700 to-primary-700 text-white py-20 md:py-28">
        <div className="container-custom">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-4xl mx-auto"
          >
            <Link
              href="/careers/jobs"
              className="inline-flex items-center text-white/80 hover:text-white mb-6 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Jobs
            </Link>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
              Marketing Job Opportunities
            </h1>
            <p className="text-xl md:text-2xl text-white/90">
              Join our marketing team in full-time or part-time positions across various marketing roles
            </p>
          </motion.div>
        </div>
      </section>

      <section className="section-padding bg-white">
        <div className="container-custom max-w-4xl">
          <div className="prose prose-lg max-w-none">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">Available Positions</h2>
            <p className="text-gray-700 mb-6">
              We're looking for talented marketing professionals to join our team. Explore our current openings and find the perfect role for your career.
            </p>

            <h3 className="text-2xl font-bold text-gray-900 mb-4 mt-8">Positions Available</h3>
            <ul className="space-y-3 mb-8">
              {[
                "Digital Marketing Specialist",
                "Content Marketing Manager",
                "Social Media Coordinator",
                "SEO/SEM Specialist",
                "Email Marketing Manager",
                "Marketing Analyst",
                "Brand Manager",
              ].map((item, index) => (
                <motion.li
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  className="flex items-start"
                >
                  <CheckCircle className="w-5 h-5 text-accent-600 mr-3 mt-1 flex-shrink-0" />
                  <span className="text-gray-700">{item}</span>
                </motion.li>
              ))}
            </ul>

            <h3 className="text-2xl font-bold text-gray-900 mb-4 mt-8">General Requirements</h3>
            <ul className="space-y-3 mb-8">
              {[
                "Relevant degree in marketing, business, or related field",
                "Proven experience in marketing roles",
                "Strong analytical and strategic thinking skills",
                "Excellent communication and presentation abilities",
                "Proficiency in marketing tools and platforms",
                "Ability to work in a fast-paced environment",
              ].map((item, index) => (
                <motion.li
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  className="flex items-start"
                >
                  <CheckCircle className="w-5 h-5 text-accent-600 mr-3 mt-1 flex-shrink-0" />
                  <span className="text-gray-700">{item}</span>
                </motion.li>
              ))}
            </ul>

            <div className="bg-accent-50 border border-accent-200 rounded-lg p-6 mt-8">
              <h3 className="text-xl font-bold text-gray-900 mb-4">How to Apply</h3>
              <p className="text-gray-700 mb-4">
                Interested in joining our marketing team? Send your CV and cover letter to us.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <a
                  href="mailto:info@cmfagency.co.ke"
                  className="flex items-center text-accent-600 hover:text-accent-700 font-semibold"
                >
                  <Mail className="w-5 h-5 mr-2" />
                  info@cmfagency.co.ke
                </a>
                <a
                  href="tel:+254797777347"
                  className="flex items-center text-accent-600 hover:text-accent-700 font-semibold"
                >
                  <Phone className="w-5 h-5 mr-2" />
                  +254 797 777347
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
