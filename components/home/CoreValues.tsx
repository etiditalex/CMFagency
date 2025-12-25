"use client";

import { motion } from "framer-motion";
import { Lightbulb, Shield, Star, Heart, TrendingUp } from "lucide-react";

const coreValues = [
  {
    icon: Lightbulb,
    title: "Innovation",
    description: "We embrace creativity, emerging trends, and modern technologies to deliver forward-thinking marketing strategies and memorable event experiences.",
    iconColor: "text-yellow-500",
    bgColor: "bg-yellow-50",
  },
  {
    icon: Shield,
    title: "Integrity",
    description: "We operate with honesty, transparency, and accountability in every engagement, building trust with our clients, partners, and stakeholders.",
    iconColor: "text-blue-500",
    bgColor: "bg-blue-50",
  },
  {
    icon: Star,
    title: "Excellence",
    description: "We are committed to the highest standards of quality, professionalism, and execution in both marketing solutions and event delivery.",
    iconColor: "text-primary-600",
    bgColor: "bg-primary-50",
  },
  {
    icon: Heart,
    title: "Client-Centricity",
    description: "Our clients' goals are at the center of everything we do. We listen, collaborate, and tailor solutions that deliver real value and measurable impact.",
    iconColor: "text-red-500",
    bgColor: "bg-red-50",
  },
  {
    icon: TrendingUp,
    title: "Impact & Results",
    description: "We focus on outcomes, not just activity. Our success is measured by growth, visibility, engagement, and lasting impact for our clients.",
    iconColor: "text-green-500",
    bgColor: "bg-green-50",
  },
];

export default function CoreValues() {
  return (
    <section className="section-padding bg-white">
      <div className="container-custom">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4 text-gray-900 uppercase tracking-wide">
            Core Values
          </h2>
          <div className="flex items-center justify-center space-x-2">
            <div className="w-2 h-2 rounded-full bg-primary-400"></div>
            <div className="w-2 h-2 rounded-full bg-primary-700"></div>
          </div>
        </motion.div>

        {/* Top Row - 3 items */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {coreValues.slice(0, 3).map((value, index) => (
            <motion.div
              key={value.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="flex flex-col items-center text-center"
            >
              <div className={`w-24 h-24 rounded-full ${value.bgColor} flex items-center justify-center mb-6`}>
                <value.icon className={`w-12 h-12 ${value.iconColor}`} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">{value.title}</h3>
              <p className="text-gray-700 leading-relaxed text-left">{value.description}</p>
            </motion.div>
          ))}
        </div>

        {/* Bottom Row - 2 items */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {coreValues.slice(3).map((value, index) => (
            <motion.div
              key={value.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: (index + 3) * 0.1 }}
              className="flex flex-col items-center text-center"
            >
              <div className={`w-24 h-24 rounded-full ${value.bgColor} flex items-center justify-center mb-6`}>
                <value.icon className={`w-12 h-12 ${value.iconColor}`} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">{value.title}</h3>
              <p className="text-gray-700 leading-relaxed text-left">{value.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

