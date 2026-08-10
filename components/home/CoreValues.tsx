"use client";

import { motion } from "framer-motion";
import { Lightbulb, Shield, Star, Heart, TrendingUp } from "lucide-react";

const coreValues = [
  {
    icon: Lightbulb,
    title: "Innovation",
    description:
      "We embrace creativity, emerging trends, and modern technologies to deliver forward-thinking marketing strategies and memorable event experiences.",
    iconColor: "text-yellow-500",
    bgColor: "bg-yellow-50",
  },
  {
    icon: Shield,
    title: "Integrity",
    description:
      "We operate with honesty, transparency, and accountability in every engagement, building trust with our clients, partners, and stakeholders.",
    iconColor: "text-blue-500",
    bgColor: "bg-blue-50",
  },
  {
    icon: Star,
    title: "Excellence",
    description:
      "We are committed to the highest standards of quality, professionalism, and execution in both marketing solutions and event delivery.",
    iconColor: "text-primary-600",
    bgColor: "bg-primary-50",
  },
  {
    icon: Heart,
    title: "Client-Centricity",
    description:
      "Our clients' goals are at the center of everything we do. We listen, collaborate, and tailor solutions that deliver real value and measurable impact.",
    iconColor: "text-red-500",
    bgColor: "bg-red-50",
  },
  {
    icon: TrendingUp,
    title: "Impact & Results",
    description:
      "We focus on outcomes, not just activity. Our success is measured by growth, visibility, engagement, and lasting impact for our clients.",
    iconColor: "text-green-500",
    bgColor: "bg-green-50",
  },
];

export default function CoreValues() {
  return (
    <section className="bg-white py-10 sm:py-14 md:py-20">
      <div className="container-custom">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-8 text-center sm:mb-12 md:mb-14"
        >
          <h2 className="mb-3 text-2xl font-bold uppercase tracking-wide text-gray-900 sm:mb-4 sm:text-4xl md:text-5xl">
            Core Values
          </h2>
          <div className="flex items-center justify-center space-x-2">
            <div className="h-2 w-2 rounded-full bg-primary-400" />
            <div className="h-2 w-2 rounded-full bg-primary-700" />
          </div>
        </motion.div>

        <div className="mb-8 grid grid-cols-1 gap-6 sm:gap-8 md:mb-10 md:grid-cols-3">
          {coreValues.slice(0, 3).map((value, index) => (
            <motion.div
              key={value.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="flex flex-col items-center text-center"
            >
              <div
                className={`mb-4 flex h-16 w-16 items-center justify-center rounded-full sm:mb-6 sm:h-20 sm:w-20 md:h-24 md:w-24 ${value.bgColor}`}
              >
                <value.icon className={`h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 ${value.iconColor}`} />
              </div>
              <h3 className="mb-2 text-lg font-bold text-gray-900 sm:mb-4 sm:text-xl">{value.title}</h3>
              <p className="text-left text-sm leading-relaxed text-gray-700 sm:text-base">
                {value.description}
              </p>
            </motion.div>
          ))}
        </div>

        <div className="mx-auto grid max-w-4xl grid-cols-1 gap-6 sm:gap-8 md:grid-cols-2">
          {coreValues.slice(3).map((value, index) => (
            <motion.div
              key={value.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: (index + 3) * 0.1 }}
              className="flex flex-col items-center text-center"
            >
              <div
                className={`mb-4 flex h-16 w-16 items-center justify-center rounded-full sm:mb-6 sm:h-20 sm:w-20 md:h-24 md:w-24 ${value.bgColor}`}
              >
                <value.icon className={`h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 ${value.iconColor}`} />
              </div>
              <h3 className="mb-2 text-lg font-bold text-gray-900 sm:mb-4 sm:text-xl">{value.title}</h3>
              <p className="text-left text-sm leading-relaxed text-gray-700 sm:text-base">
                {value.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
