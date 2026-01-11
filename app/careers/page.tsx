"use client";

import { motion } from "framer-motion";
import { Briefcase, Users, GraduationCap, ArrowRight, CheckCircle } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

const careerCategories = [
  {
    icon: Briefcase,
    title: "Attachments",
    description: "Explore attachment opportunities across various fields to gain practical experience.",
    href: "/careers/attachments",
    color: "from-primary-500 to-primary-600",
    opportunities: ["Marketing", "Fashion", "Events", "Education"],
  },
  {
    icon: GraduationCap,
    title: "Internships",
    description: "Join our internship programs to develop skills and build your professional portfolio.",
    href: "/careers/internships",
    color: "from-secondary-500 to-secondary-600",
    opportunities: ["Marketing", "Fashion", "Events", "Education"],
  },
  {
    icon: Users,
    title: "Jobs",
    description: "Discover full-time and part-time job opportunities in various departments.",
    href: "/careers/jobs",
    color: "from-accent-500 to-accent-600",
    opportunities: ["Marketing", "Fashion", "Events", "Education"],
  },
];

export default function CareersPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-primary-600 via-primary-700 to-secondary-700 text-white py-20 md:py-28">
        <div className="container-custom">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-4xl mx-auto"
          >
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
              Careers at CMF Agency
            </h1>
            <p className="text-xl md:text-2xl text-white/90 mb-8">
              Join our team and be part of Kenya's leading marketing agency. Explore opportunities in attachments, internships, and full-time positions.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Career Categories */}
      <section className="section-padding bg-white">
        <div className="container-custom">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Explore Career Opportunities
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Choose the path that best fits your career goals and experience level
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {careerCategories.map((category, index) => (
              <motion.div
                key={category.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="group"
              >
                <Link href={category.href} className="block h-full">
                  <div className="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 p-8 h-full border border-gray-200 hover:border-primary-300">
                    <div className={`w-16 h-16 rounded-lg bg-gradient-to-r ${category.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                      <category.icon className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-3 group-hover:text-primary-600 transition-colors">
                      {category.title}
                    </h3>
                    <p className="text-gray-600 mb-6">
                      {category.description}
                    </p>
                    <div className="mb-6">
                      <p className="text-sm font-semibold text-gray-700 mb-3">Available Opportunities:</p>
                      <div className="flex flex-wrap gap-2">
                        {category.opportunities.map((opp) => (
                          <span
                            key={opp}
                            className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium"
                          >
                            {opp}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center text-primary-600 font-semibold group-hover:gap-2 transition-all">
                      <span>Explore {category.title}</span>
                      <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Join Us Section */}
      <section className="section-padding bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="container-custom">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Why Join CMF Agency?
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { title: "Growth Opportunities", description: "Continuous learning and career advancement" },
              { title: "Innovative Environment", description: "Work with cutting-edge marketing strategies" },
              { title: "Team Collaboration", description: "Join a supportive and creative team" },
              { title: "Impactful Work", description: "Make a difference for businesses across Kenya" },
            ].map((benefit, index) => (
              <motion.div
                key={benefit.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-white p-6 rounded-lg shadow-md"
              >
                <CheckCircle className="w-8 h-8 text-primary-600 mb-4" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">{benefit.title}</h3>
                <p className="text-gray-600">{benefit.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
