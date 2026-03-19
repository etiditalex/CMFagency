"use client";

import { motion } from "framer-motion";
import { ArrowLeft, CheckCircle, Mail, Phone, GraduationCap } from "lucide-react";
import Link from "next/link";

import { useManagedPublicPage } from "@/components/pages/useManagedPublicPage";
import CareerDetailTemplate from "@/components/careers/CareerDetailTemplate";

export default function InternshipEventsOpportunitiesPage() {
  const route = "/careers/internships/events-opportunities";
  const { loading, page } = useManagedPublicPage(route);

  if (loading && !page) {
    return (
      <div className="pt-28 min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (page?.section === "careers") {
    return (
      <CareerDetailTemplate
        activeHref={route}
        title={page.title || "Events Internship Opportunities"}
        heroLabel={page.hero_label || "EVENTS (INTERNSHIPS)"}
        description={page.description || "Learn event planning, coordination, and management in a dynamic environment."}
        featuresTitle={page.features_title || "FEATURES"}
        features={(Array.isArray(page.features) ? page.features : []).map((x) => String(x))}
        benefitsTitle={page.benefits_title || "BENEFITS"}
        benefits={(Array.isArray(page.benefits) ? page.benefits : []).map((x) => String(x))}
        ctaTitle={page.cta_title || "How to Apply"}
        ctaDescription={page.cta_description || "Contact us to learn more about events internship opportunities."}
        icon={GraduationCap}
      />
    );
  }

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
              Events Internship Opportunities
            </h1>
            <p className="text-xl md:text-2xl text-white/90">
              Learn event planning, coordination, and management in a dynamic environment
            </p>
          </motion.div>
        </div>
      </section>

      <section className="section-padding bg-white">
        <div className="container-custom max-w-4xl">
          <div className="prose prose-lg max-w-none">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">About This Internship</h2>
            <p className="text-gray-700 mb-6">
              Our Events Internship Program provides hands-on experience in planning and executing various events, from corporate functions to fashion shows.
            </p>

            <h3 className="text-2xl font-bold text-gray-900 mb-4 mt-8">What You'll Learn</h3>
            <ul className="space-y-3 mb-8">
              {[
                "Comprehensive event planning and coordination",
                "Vendor relations and contract management",
                "Budget planning and financial management",
                "On-site event execution and problem-solving",
                "Client communication and relationship building",
                "Marketing and promotion strategies",
                "Post-event analysis and reporting",
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
                "Currently enrolled in or recently graduated from event management, hospitality, or related program",
                "Strong organizational and multitasking abilities",
                "Excellent communication and interpersonal skills",
                "Ability to work flexible hours including weekends",
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
                Contact us to learn more about Events Internship opportunities.
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
