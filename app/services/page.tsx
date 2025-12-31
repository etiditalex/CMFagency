"use client";

import { motion } from "framer-motion";
import { TrendingUp, Globe, Award, Target, Users, Lightbulb, ArrowRight, CheckCircle } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

const services = [
  {
    icon: TrendingUp,
    title: "Digital Marketing",
    description: "Social media marketing, email marketing, and online reputation management to reach target audiences.",
    href: "/services/digital-marketing",
    features: ["Social Media Marketing", "Email Marketing", "SEO & PPC", "Online Reputation Management"],
  },
  {
    icon: Globe,
    title: "Website Development & Design",
    description: "Custom websites that are visually appealing and user-friendly, with web development and maintenance services.",
    href: "/services/website-development",
    features: ["Custom Web Design", "Responsive Development", "E-commerce Solutions", "Website Maintenance"],
  },
  {
    icon: Award,
    title: "Branding & Creative Services",
    description: "Brand strategy development, logo design, and graphic design for marketing materials.",
    href: "/services/branding",
    features: ["Brand Strategy", "Logo Design", "Graphic Design", "Brand Guidelines"],
  },
  {
    icon: Target,
    title: "Market Research & Analysis",
    description: "Consumer behavior analysis, competitor analysis, marketing trend research, and data analytics.",
    href: "/services/market-research",
    features: ["Consumer Analysis", "Competitor Research", "Trend Analysis", "Data Analytics"],
  },
  {
    icon: Users,
    title: "Events Marketing",
    description: "Planning and managing all aspects of events, from trade show booth design to post-event follow-up.",
    href: "/services/events-marketing",
    features: ["Event Planning", "Event Marketing", "Venue Sourcing", "Post-Event Analysis"],
  },
  {
    icon: Lightbulb,
    title: "Content Creation",
    description: "Creating engaging content including commercial explainer videos and testimonials.",
    href: "/services/content-creation",
    features: ["Video Production", "Content Strategy", "Testimonials", "Creative Content"],
  },
];

export default function ServicesPage() {
  return (
    <div className="pt-20 min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="relative section-padding overflow-hidden min-h-[400px] md:min-h-[500px] flex items-center">
        {/* Background Image */}
        <div className="absolute inset-0">
          <Image
            src="https://res.cloudinary.com/dyfnobo9r/image/upload/v1765955876/WhatsApp_Image_2025-12-17_at_9.32.06_AM_loqhra.jpg"
            alt="Our Services"
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
            className="text-center max-w-4xl mx-auto"
          >
            <h1 className="text-4xl md:text-6xl font-bold mb-6">Our Services</h1>
            <p className="text-xl text-white/90 leading-relaxed">
              Comprehensive marketing solutions designed to help your business thrive and grow. From digital marketing to event planning, we provide end-to-end services that drive results.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Services Grid */}
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
              What We Offer
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Explore our comprehensive range of marketing and business services
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {services.map((service, index) => (
              <motion.div
                key={service.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-shadow duration-300 overflow-hidden border border-gray-100"
              >
                <Link href={service.href} className="block">
                  <div className="p-6">
                    <div className="w-16 h-16 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-lg flex items-center justify-center mb-4">
                      <service.icon className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold mb-3 text-gray-900">{service.title}</h3>
                    <p className="text-gray-600 mb-6 leading-relaxed">{service.description}</p>
                    
                    <div className="space-y-2 mb-6">
                      {service.features.map((feature) => (
                        <div key={feature} className="flex items-center space-x-2">
                          <CheckCircle className="w-4 h-4 text-primary-600 flex-shrink-0" />
                          <span className="text-sm text-gray-600">{feature}</span>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center text-primary-600 font-semibold group">
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

      {/* Why Choose Us Section */}
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
              Why Choose Changer Fusions?
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              We combine innovative strategies with proven methodologies to deliver exceptional results
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                title: "Expert Team",
                description: "Our experienced professionals bring years of industry expertise to every project.",
              },
              {
                title: "Custom Solutions",
                description: "Tailored strategies designed specifically for your business needs and goals.",
              },
              {
                title: "Proven Results",
                description: "Track record of delivering measurable results and driving business growth.",
              },
            ].map((item, index) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-white p-6 rounded-xl shadow-lg"
              >
                <h3 className="text-xl font-bold mb-3 text-gray-900">{item.title}</h3>
                <p className="text-gray-600 leading-relaxed">{item.description}</p>
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
            <h2 className="text-4xl md:text-5xl font-bold mb-6">Ready to Get Started?</h2>
            <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
              Let's discuss how our services can help your business achieve its goals and drive growth.
            </p>
            <Link
              href="/contact"
              className="inline-flex items-center space-x-2 bg-white text-primary-600 hover:bg-gray-100 font-semibold py-4 px-8 rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              <span>Contact Us</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
}

