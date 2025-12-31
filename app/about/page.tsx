"use client";

import { motion } from "framer-motion";
import { Target, Users, Zap, Award, CheckCircle, TrendingUp, Globe, Lightbulb } from "lucide-react";
import Image from "next/image";

const services = [
  {
    icon: TrendingUp,
    title: "Digital Marketing",
    description: "Social media marketing, email marketing, and online reputation management to reach target audiences.",
  },
  {
    icon: Globe,
    title: "Website Development & Design",
    description: "Custom websites that are visually appealing and user-friendly, with web development and maintenance services.",
  },
  {
    icon: Award,
    title: "Branding & Creative Services",
    description: "Brand strategy development, logo design, and graphic design for marketing materials.",
  },
  {
    icon: Target,
    title: "Market Research & Analysis",
    description: "Consumer behavior analysis, competitor analysis, marketing trend research, and data analytics.",
  },
  {
    icon: Users,
    title: "Events Marketing",
    description: "Planning and managing all aspects of events, from trade show booth design to post-event follow-up.",
  },
  {
    icon: Lightbulb,
    title: "Content Creation",
    description: "Creating engaging content including commercial explainer videos and testimonials.",
  },
];

export default function AboutPage() {
  return (
    <div className="pt-20 min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="relative section-padding overflow-hidden min-h-[500px] md:min-h-[600px] flex items-center">
        {/* Background Image */}
        <div className="absolute inset-0">
          <Image
            src="https://res.cloudinary.com/dyfnobo9r/image/upload/v1765955875/WhatsApp_Image_2025-12-17_at_9.33.02_AM_cjrrxx.jpg"
            alt="About Changer Fusions"
            fill
            className="object-cover object-center"
            priority
          />
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-primary-900/85 via-secondary-800/75 to-primary-900/85"></div>
        </div>
        
        <div className="container-custom relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-4xl mx-auto"
          >
            <div className="mb-6">
              <span className="inline-block bg-white/20 backdrop-blur-sm text-white px-6 py-3 rounded-full text-lg font-bold mb-4 shadow-lg">
                Market to thrive, Market to exist
              </span>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold mb-6 text-white drop-shadow-lg">
              About Changer Fusions
            </h1>
            <p className="text-xl text-white/95 leading-relaxed drop-shadow-md">
              Changer Fusions is a forward-thinking marketing strategic partner specializing in blending innovative marketing techniques, cutting-edge technologies, and transformative strategies to create impactful and tailored solutions for clients. With a focus on harnessing the power of change and innovation, Changer Fusions drives meaningful results and facilitates growth in an ever-evolving marketing landscape.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Vision & Mission Section */}
      <section className="section-padding bg-white">
        <div className="container-custom">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="bg-gradient-to-br from-primary-50 to-secondary-50 p-8 rounded-2xl"
            >
              <div className="flex items-center space-x-4 mb-6">
                <div className="w-16 h-16 bg-primary-600 rounded-lg flex items-center justify-center">
                  <Target className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-3xl font-bold text-gray-900">Our Vision</h2>
              </div>
              <p className="text-lg text-gray-700 leading-relaxed">
                To be the driving force behind businesses' success in a dynamic and ever-evolving market landscape.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="bg-gradient-to-br from-secondary-50 to-primary-50 p-8 rounded-2xl"
            >
              <div className="flex items-center space-x-4 mb-6">
                <div className="w-16 h-16 bg-secondary-600 rounded-lg flex items-center justify-center">
                  <Zap className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-3xl font-bold text-gray-900">Our Mission</h2>
              </div>
              <p className="text-lg text-gray-700 leading-relaxed">
                To harness the power of marketing as the catalyst for change and innovation, empowering businesses to thrive and define their existence in the marketplace.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* What We Do Section */}
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
              What We Do
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Changer Fusions offers a comprehensive suite of marketing services designed to meet the needs of businesses of all sizes.
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
                className="bg-white p-6 rounded-xl shadow-lg hover:shadow-2xl transition-shadow duration-300"
              >
                <div className="w-14 h-14 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-lg flex items-center justify-center mb-4">
                  <service.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-gray-900">{service.title}</h3>
                <p className="text-gray-600 leading-relaxed">{service.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Market Research Details */}
      <section className="section-padding bg-white">
        <div className="container-custom">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="max-w-4xl mx-auto"
          >
            <h2 className="text-3xl font-bold mb-6 text-gray-900 text-center">Market Research & Analysis Services</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                "Consumer behavior analysis",
                "Competitor analysis",
                "Marketing trend research",
                "Data analytics and reporting",
                "Marketing strategy development",
                "Market entry and expansion strategies",
              ].map((item, index) => (
                <motion.div
                  key={item}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  className="flex items-center space-x-3 bg-gray-50 p-4 rounded-lg"
                >
                  <CheckCircle className="w-6 h-6 text-primary-600 flex-shrink-0" />
                  <span className="text-gray-700">{item}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* What Makes Us Different */}
      <section className="section-padding bg-gradient-to-br from-primary-50 to-secondary-50">
        <div className="container-custom">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-4xl font-bold mb-6 text-gray-900">What Makes Us Different?</h2>
              <p className="text-lg text-gray-700 mb-6 leading-relaxed">
                Changer Fusions' focus on "blending innovative marketing techniques" suggests we stay on top of the latest marketing trends and integrate them into our strategies. Our motto highlights our proactive approach, emphasizing the importance of marketing for business success.
              </p>
              <p className="text-lg text-gray-700 leading-relaxed">
                We conduct in-depth research to understand your target audience, your competitors, and current marketing trends. This data analysis allows us to develop effective marketing strategies that drive meaningful results and facilitate growth in an ever-evolving marketing landscape.
              </p>
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
                  src="https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892262/IMG_9853_ys9f08.jpg"
                  alt="Changer Fusions Team"
                  fill
                  className="object-cover"
                />
              </div>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  );
}
