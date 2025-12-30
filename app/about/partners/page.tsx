"use client";

import { motion } from "framer-motion";
import { Handshake, Building2, Award, TrendingUp } from "lucide-react";

export default function OurPartnersPage() {
  return (
    <div className="pt-20 min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="section-padding bg-gradient-to-br from-primary-50 to-secondary-50">
        <div className="container-custom">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-4xl mx-auto"
          >
            <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
              Our Partners
            </h1>
            <p className="text-lg text-gray-600">
              Building strong partnerships to deliver exceptional value and create lasting impact
            </p>
          </motion.div>
        </div>
      </section>

      {/* Content Section */}
      <section className="section-padding bg-white">
        <div className="container-custom">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-4xl mx-auto text-center"
          >
            <div className="mb-12">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center mx-auto mb-6">
                <Handshake className="w-12 h-12 text-white" />
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Partner With Us
              </h2>
              <p className="text-lg text-gray-600 leading-relaxed">
                At Changer Fusions, we believe in the power of collaboration. Our strategic partnerships 
                enable us to deliver comprehensive solutions and create meaningful experiences for our clients. 
                We work with trusted organizations across various industries to bring innovation, expertise, 
                and excellence to every project.
              </p>
            </div>

            {/* Partnership Benefits */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12">
              {[
                {
                  icon: Building2,
                  title: "Corporate Partnerships",
                  description: "Collaborate with leading organizations to deliver impactful corporate events and marketing solutions.",
                },
                {
                  icon: Award,
                  title: "Strategic Alliances",
                  description: "Form strategic alliances that combine expertise and resources for mutual growth and success.",
                },
                {
                  icon: TrendingUp,
                  title: "Growth Opportunities",
                  description: "Partner with us to access new markets, expand your reach, and achieve your business objectives.",
                },
                {
                  icon: Handshake,
                  title: "Long-term Relationships",
                  description: "Build lasting partnerships based on trust, transparency, and shared values.",
                },
              ].map((benefit, index) => (
                <motion.div
                  key={benefit.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  className="bg-gray-50 p-6 rounded-xl hover:shadow-lg transition-shadow duration-300 text-center md:text-center lg:text-left"
                >
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center mb-4 mx-auto md:mx-auto lg:mx-0">
                    <benefit.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{benefit.title}</h3>
                  <p className="text-gray-600">{benefit.description}</p>
                </motion.div>
              ))}
            </div>

            {/* CTA Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="mt-12 p-8 bg-gradient-to-br from-primary-600 to-secondary-600 rounded-2xl text-white"
            >
              <h3 className="text-2xl md:text-3xl font-bold mb-4">
                Interested in Partnering With Us?
              </h3>
              <p className="text-lg mb-6 opacity-90">
                Let's explore how we can work together to create something extraordinary.
              </p>
              <a
                href="/contact"
                className="inline-block px-8 py-3 bg-white text-primary-600 font-bold rounded-lg hover:bg-gray-100 transition-colors duration-200"
              >
                Get In Touch
              </a>
            </motion.div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}

