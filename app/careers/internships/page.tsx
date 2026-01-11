"use client";

import { motion } from "framer-motion";
import { GraduationCap, ArrowRight } from "lucide-react";
import Link from "next/link";

const opportunities = [
  {
    title: "Marketing Opportunities",
    href: "/careers/internships/marketing-opportunities",
    description: "Join our marketing team and develop skills in digital marketing, content creation, and campaign management.",
  },
  {
    title: "Fashion Opportunities",
    href: "/careers/internships/fashion-opportunities",
    description: "Explore the fashion industry through styling, event coordination, and brand management.",
  },
  {
    title: "Events Opportunities",
    href: "/careers/internships/events-opportunities",
    description: "Learn event planning, coordination, and management in a dynamic environment.",
  },
  {
    title: "Education Opportunities",
    href: "/careers/internships/education-opportunities",
    description: "Support educational initiatives and training programs in marketing and business.",
  },
];

export default function InternshipsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <section className="relative bg-gradient-to-br from-secondary-600 via-secondary-700 to-primary-700 text-white py-20 md:py-28">
        <div className="container-custom">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-4xl mx-auto"
          >
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
              Internship Opportunities
            </h1>
            <p className="text-xl md:text-2xl text-white/90 mb-8">
              Join our internship programs to develop skills and build your professional portfolio
            </p>
          </motion.div>
        </div>
      </section>

      <section className="section-padding bg-white">
        <div className="container-custom">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {opportunities.map((opp, index) => (
              <motion.div
                key={opp.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="group"
              >
                <Link href={opp.href} className="block h-full">
                  <div className="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 p-8 h-full border border-gray-200 hover:border-secondary-300">
                    <div className="w-16 h-16 rounded-lg bg-gradient-to-r from-secondary-500 to-secondary-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                      <GraduationCap className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-3 group-hover:text-secondary-600 transition-colors">
                      {opp.title}
                    </h3>
                    <p className="text-gray-600 mb-6">
                      {opp.description}
                    </p>
                    <div className="flex items-center text-secondary-600 font-semibold group-hover:gap-2 transition-all">
                      <span>Learn More</span>
                      <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
