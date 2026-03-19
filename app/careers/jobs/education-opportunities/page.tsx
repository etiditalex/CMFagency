"use client";

import { motion } from "framer-motion";
import { Briefcase, MapPin, Clock, Users, ArrowRight } from "lucide-react";
import Link from "next/link";

import { useManagedPublicPage } from "@/components/pages/useManagedPublicPage";
import CareerDetailTemplate from "@/components/careers/CareerDetailTemplate";

export default function EducationOpportunitiesPage() {
  const route = "/careers/jobs/education-opportunities";
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
        title={page.title || "Education Job Opportunities"}
        heroLabel={page.hero_label || "EDUCATION (JOBS)"}
        description={page.description || "Explore exciting education job opportunities at CMF Agency."}
        featuresTitle={page.features_title || "FEATURES"}
        features={(Array.isArray(page.features) ? page.features : []).map((x) => String(x))}
        benefitsTitle={page.benefits_title || "BENEFITS"}
        benefits={(Array.isArray(page.benefits) ? page.benefits : []).map((x) => String(x))}
        ctaTitle={page.cta_title || "Get Started"}
        ctaDescription={page.cta_description || "Contact us for more information about these roles."}
        icon={Users}
      />
    );
  }

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
              Education Opportunities - Jobs
            </h1>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Explore exciting education job opportunities at CMF Agency
            </p>
          </motion.div>

          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-lg shadow-lg p-8 border border-gray-200">
              <p className="text-gray-700 text-center">
                Education job opportunities are coming soon. Check back regularly for updates.
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
