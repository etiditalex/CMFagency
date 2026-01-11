"use client";

import { motion } from "framer-motion";
import { ArrowLeft, CheckCircle, Mail, Phone } from "lucide-react";
import Link from "next/link";

export default function InternshipMarketingOpportunitiesPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <section className="relative bg-gradient-to-br from-secondary-600 via-secondary-700 to-primary-700 text-white py-20 md:py-28">
        <div className="container-custom">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-4xl mx-auto"
          >
            <Link
              href="/careers/internships"
              className="inline-flex items-center text-white/80 hover:text-white mb-6 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Internships
            </Link>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
              Marketing Internship Opportunities
            </h1>
            <p className="text-xl md:text-2xl text-white/90">
              Join our marketing team and develop skills in digital marketing, content creation, and campaign management
            </p>
          </motion.div>
        </div>
      </section>

      <section className="section-padding bg-white">
        <div className="container-custom max-w-4xl">
          <div className="prose prose-lg max-w-none">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">About This Internship</h2>
            <p className="text-gray-700 mb-6">
              Our Marketing Internship Program provides comprehensive training in digital marketing. You'll work on real client projects, learn industry best practices, and develop a professional portfolio.
            </p>

            <h3 className="text-2xl font-bold text-gray-900 mb-4 mt-8">What You'll Learn</h3>
            <ul className="space-y-3 mb-8">
              {[
                "Advanced digital marketing strategies",
                "Content creation and copywriting",
                "Social media management and analytics",
                "SEO and SEM optimization",
                "Email marketing automation",
                "Marketing analytics and reporting",
                "Client management and communication",
              ].map((item, index) => (
                <motion.li
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  className="flex items-start"
                >
                  <CheckCircle className="w-5 h-5 text-secondary-600 mr-3 mt-1 flex-shrink-0" />
                  <span className="text-gray-700">{item}</span>
                </motion.li>
              ))}
            </ul>

            <h3 className="text-2xl font-bold text-gray-900 mb-4 mt-8">Requirements</h3>
            <ul className="space-y-3 mb-8">
              {[
                "Currently enrolled in or recently graduated from marketing, business, or related program",
                "Strong interest in digital marketing",
                "Excellent communication and writing skills",
                "Proficiency in social media platforms",
                "Commitment to 3-6 month internship period",
              ].map((item, index) => (
                <motion.li
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  className="flex items-start"
                >
                  <CheckCircle className="w-5 h-5 text-secondary-600 mr-3 mt-1 flex-shrink-0" />
                  <span className="text-gray-700">{item}</span>
                </motion.li>
              ))}
            </ul>

            <div className="bg-secondary-50 border border-secondary-200 rounded-lg p-6 mt-8">
              <h3 className="text-xl font-bold text-gray-900 mb-4">How to Apply</h3>
              <p className="text-gray-700 mb-4">
                Interested in our Marketing Internship Program? Contact us to learn more.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <a
                  href="mailto:info@cmfagency.co.ke"
                  className="flex items-center text-secondary-600 hover:text-secondary-700 font-semibold"
                >
                  <Mail className="w-5 h-5 mr-2" />
                  info@cmfagency.co.ke
                </a>
                <a
                  href="tel:+254797777347"
                  className="flex items-center text-secondary-600 hover:text-secondary-700 font-semibold"
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
