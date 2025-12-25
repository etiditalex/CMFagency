"use client";

import { motion } from "framer-motion";
import { CheckCircle, Target, Users, Zap } from "lucide-react";
import Image from "next/image";

const features = [
  "Comprehensive event planning solutions",
  "Integrated marketing and branding services",
  "Career development and training programs",
  "Job opportunities and talent management",
  "Modern UI/UX with mobile compatibility",
  "Responsive and customizable templates",
];

const stats = [
  { icon: Target, value: "500+", label: "Events Planned" },
  { icon: Users, value: "10K+", label: "Active Members" },
  { icon: Zap, value: "98%", label: "Client Satisfaction" },
];

export default function CompanyIntro() {
  return (
    <section className="section-padding bg-white">
      <div className="container-custom">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
              About Changer Fusions
            </h2>
            <p className="text-lg text-gray-600 mb-6 leading-relaxed">
              Changer Fusions is a dynamic platform offering comprehensive solutions for event planning,
              marketing, and career development. We integrate planning, branding, training,
              job opportunities, and talent management into one seamless experience.
            </p>
            <p className="text-lg text-gray-600 mb-8 leading-relaxed">
              Our priority is modern UI/UX and mobile compatibility. We select responsive,
              customizable event management templates and integrate event calendars, booking
              tools, and portfolio galleries to provide the best experience for our users.
            </p>

            <div className="space-y-3 mb-8">
              {features.map((feature, index) => (
                <motion.div
                  key={feature}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  className="flex items-center space-x-3"
                >
                  <CheckCircle className="w-6 h-6 text-primary-600 flex-shrink-0" />
                  <span className="text-gray-700">{feature}</span>
                </motion.div>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-6">
              {stats.map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  className="text-center"
                >
                  <stat.icon className="w-8 h-8 text-primary-600 mx-auto mb-2" />
                  <div className="text-3xl font-bold text-gray-900 mb-1">{stat.value}</div>
                  <div className="text-sm text-gray-600">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative"
          >
            <div className="relative aspect-square rounded-2xl overflow-hidden shadow-2xl">
              <Image
                src="https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892252/IMG_0310_lemh6v.jpg"
                alt="Changer Fusions Team"
                fill
                className="object-cover"
              />
            </div>
            <div className="absolute -bottom-6 -left-6 bg-primary-600 text-white p-6 rounded-xl shadow-xl hidden lg:block">
              <div className="text-3xl font-bold mb-1">15+</div>
              <div className="text-sm">Years of Experience</div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}


