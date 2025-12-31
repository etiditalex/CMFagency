"use client";

import { motion } from "framer-motion";
import { Users, CheckCircle, ArrowRight } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

const benefits = [
  "Successful and memorable events",
  "Increased brand visibility",
  "Enhanced attendee engagement",
  "Measurable event ROI",
  "Professional event execution",
];

export default function EventsMarketingPage() {
  return (
    <div className="pt-20 min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="relative section-padding overflow-hidden min-h-[400px] md:min-h-[500px] flex items-center">
        {/* Background Image */}
        <div className="absolute inset-0">
          <Image
            src="https://res.cloudinary.com/dyfnobo9r/image/upload/v1767037229/CoastFashionsandmodellingawards8_ifgxzv.jpg"
            alt="Events Marketing"
            fill
            className="object-cover object-center"
            priority
          />
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-primary-900/80 via-secondary-800/70 to-primary-900/80"></div>
        </div>
        
        <div className="container-custom relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-3xl mx-auto"
          >
            <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-6">
              <Users className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl md:text-6xl font-bold mb-6">Events Marketing</h1>
            <p className="text-xl text-white/90 leading-relaxed">
              Plan and manage all aspects of your events, from trade show booth design to post-event follow-up and analysis. We handle event promotion and marketing to ensure a successful event.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Event Management Scope Section */}
      <section className="section-padding bg-white">
        <div className="container-custom">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
              Our Event Management Scope
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Comprehensive event management services from concept to evaluation
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12 max-w-5xl mx-auto">
            {[
              "Event Concept Development",
              "Planning & Budgeting",
              "Venue Sourcing & Setup",
              "Event Marketing & Promotion",
              "Logistics & Vendor Management",
              "On-site Coordination & Execution",
              "Media Coverage & Documentation",
              "Post-Event Reporting & Evaluation",
            ].map((item, index) => (
              <motion.div
                key={item}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg"
              >
                <CheckCircle className="w-6 h-6 text-primary-600 flex-shrink-0 mt-1" />
                <span className="text-gray-700 font-medium">{item}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="section-padding bg-gray-50">
        <div className="container-custom">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
              Why Choose Our Events Marketing Services?
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {benefits.map((benefit, index) => (
              <motion.div
                key={benefit}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-white p-6 rounded-xl shadow-lg"
              >
                <p className="text-gray-700">{benefit}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="section-padding bg-primary-600 text-white">
        <div className="container-custom text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6">Ready to Host an Unforgettable Event?</h2>
            <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
              Let's plan and execute an event that leaves a lasting impression on your audience.
            </p>
            <Link
              href="/contact"
              className="inline-flex items-center space-x-2 bg-white text-primary-600 hover:bg-gray-100 font-semibold py-4 px-8 rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              <span>Get Started</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
}

