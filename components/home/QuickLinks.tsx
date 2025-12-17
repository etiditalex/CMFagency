"use client";

import { motion } from "framer-motion";
import { Calendar, Image as ImageIcon, Briefcase, Users, BookOpen, TrendingUp } from "lucide-react";
import Link from "next/link";

const quickLinks = [
  {
    icon: Calendar,
    title: "Events Calendar",
    description: "Browse upcoming and past events",
    href: "/events",
    color: "from-primary-500 to-primary-600",
  },
  {
    icon: ImageIcon,
    title: "Portfolios",
    description: "Explore creative showcases",
    href: "/portfolios",
    color: "from-secondary-500 to-secondary-600",
  },
  {
    icon: Briefcase,
    title: "Job Board",
    description: "Find career opportunities",
    href: "/jobs",
    color: "from-accent-500 to-accent-600",
  },
  {
    icon: Users,
    title: "Talent Showcase",
    description: "Discover talented professionals",
    href: "/talent",
    color: "from-primary-500 to-secondary-600",
  },
  {
    icon: BookOpen,
    title: "Training Programs",
    description: "Enhance your skills",
    href: "/training",
    color: "from-secondary-500 to-accent-600",
  },
  {
    icon: TrendingUp,
    title: "Career Development",
    description: "Grow your professional network",
    href: "/career",
    color: "from-accent-500 to-primary-600",
  },
];

export default function QuickLinks() {
  return (
    <section className="section-padding bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="container-custom">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
            Quick Links
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Quick access to all sections of our platform
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {quickLinks.map((link, index) => (
            <motion.div
              key={link.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              whileHover={{ y: -5 }}
            >
              <Link
                href={link.href}
                className="block bg-white p-6 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 group"
              >
                <div className={`w-14 h-14 rounded-lg bg-gradient-to-r ${link.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <link.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-2 text-gray-900 group-hover:text-primary-600 transition-colors">
                  {link.title}
                </h3>
                <p className="text-gray-600">{link.description}</p>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}


