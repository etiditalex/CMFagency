"use client";

import { motion } from "framer-motion";
import { Briefcase, ArrowLeft, CheckCircle, Mail, Phone } from "lucide-react";
import Link from "next/link";

export default function MarketingOpportunitiesPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-primary-600 via-primary-700 to-secondary-700 text-white py-20 md:py-28">
        <div className="container-custom">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-4xl mx-auto"
          >
            <Link
              href="/careers/attachments"
              className="inline-flex items-center text-white/80 hover:text-white mb-6 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Attachments
            </Link>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
              Marketing Attachment Opportunities
            </h1>
            <p className="text-xl md:text-2xl text-white/90">
              Gain hands-on experience in digital marketing, content creation, and campaign management
            </p>
          </motion.div>
        </div>
      </section>

      {/* Content Section */}
      <section className="section-padding bg-white">
        <div className="container-custom max-w-4xl">
          <div className="prose prose-lg max-w-none">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">About This Opportunity</h2>
            <p className="text-gray-700 mb-6">
              Our Marketing Attachment Program offers students and recent graduates the opportunity to gain practical experience in various aspects of marketing. You'll work alongside our experienced marketing team and learn about digital marketing strategies, content creation, social media management, and campaign execution.
            </p>

            <h3 className="text-2xl font-bold text-gray-900 mb-4 mt-8">What You'll Learn</h3>
            <ul className="space-y-3 mb-8">
              {[
                "Digital marketing strategies and tactics",
                "Content creation and copywriting",
                "Social media management and analytics",
                "SEO and SEM techniques",
                "Email marketing campaigns",
                "Marketing analytics and reporting",
                "Client communication and project management",
              ].map((item, index) => (
                <motion.li
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  className="flex items-start"
                >
                  <CheckCircle className="w-5 h-5 text-primary-600 mr-3 mt-1 flex-shrink-0" />
                  <span className="text-gray-700">{item}</span>
                </motion.li>
              ))}
            </ul>

            <h3 className="text-2xl font-bold text-gray-900 mb-4 mt-8">Requirements</h3>
            <ul className="space-y-3 mb-8">
              {[
                "Currently enrolled in a marketing, business, or related program",
                "Strong interest in marketing and digital media",
                "Good communication and writing skills",
                "Basic knowledge of social media platforms",
                "Willingness to learn and take initiative",
              ].map((item, index) => (
                <motion.li
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  className="flex items-start"
                >
                  <CheckCircle className="w-5 h-5 text-primary-600 mr-3 mt-1 flex-shrink-0" />
                  <span className="text-gray-700">{item}</span>
                </motion.li>
              ))}
            </ul>

            <div className="bg-primary-50 border border-primary-200 rounded-lg p-6 mt-8">
              <h3 className="text-xl font-bold text-gray-900 mb-4">How to Apply</h3>
              <p className="text-gray-700 mb-4">
                Interested in joining our Marketing Attachment Program? Contact us to learn more about available positions and application requirements.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <a
                  href="mailto:info@cmfagency.co.ke"
                  className="flex items-center text-primary-600 hover:text-primary-700 font-semibold"
                >
                  <Mail className="w-5 h-5 mr-2" />
                  info@cmfagency.co.ke
                </a>
                <a
                  href="tel:+254797777347"
                  className="flex items-center text-primary-600 hover:text-primary-700 font-semibold"
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
