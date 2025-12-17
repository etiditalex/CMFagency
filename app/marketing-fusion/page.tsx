"use client";

import { motion } from "framer-motion";
import { Zap, Target, TrendingUp, Users, BarChart, Lightbulb, CheckCircle, Globe, FileText, Video, ArrowRight } from "lucide-react";
import Link from "next/link";

const services = [
  {
    icon: TrendingUp,
    title: "Digital Marketing",
    description: "Social media marketing, email marketing, and online reputation management to reach target audiences effectively.",
  },
  {
    icon: Globe,
    title: "Website Development & Design",
    description: "Custom websites that are visually appealing and user-friendly, with web development and maintenance services.",
  },
  {
    icon: Target,
    title: "Branding & Creative Services",
    description: "Brand strategy development, logo design, and graphic design for marketing materials.",
  },
  {
    icon: BarChart,
    title: "Market Research & Analysis",
    description: "Consumer behavior analysis, competitor analysis, marketing trend research, data analytics and reporting.",
  },
  {
    icon: Users,
    title: "Events Marketing",
    description: "Planning and managing all aspects of events, from trade show booth design to post-event follow-up and analysis.",
  },
  {
    icon: Video,
    title: "Content Creation",
    description: "Creating engaging content including commercial explainer videos and testimonials.",
  },
];

const marketResearchServices = [
  "Consumer behavior analysis",
  "Competitor analysis",
  "Marketing trend research",
  "Data analytics and reporting",
  "Marketing strategy development",
  "Market entry and expansion strategies",
];

const stats = [
  { value: "300%", label: "Average ROI Increase" },
  { value: "500+", label: "Successful Campaigns" },
  { value: "98%", label: "Client Satisfaction" },
  { value: "24/7", label: "Support Available" },
];

export default function MarketingFusionPage() {
  return (
    <div className="pt-20 min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="section-padding bg-gradient-to-br from-primary-600 via-secondary-600 to-primary-600 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <motion.div
            className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl"
            animate={{
              scale: [1, 1.2, 1],
              x: [0, 50, 0],
              y: [0, -50, 0],
            }}
            transition={{
              duration: 15,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        </div>
        <div className="container-custom relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-4xl mx-auto"
          >
            <div className="mb-6">
              <span className="inline-block bg-white/20 backdrop-blur-sm text-white px-6 py-3 rounded-full text-lg font-bold">
                Market to thrive, Market to exist
              </span>
            </div>
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6">
              Changer Fusions Enterprise
            </h1>
            <p className="text-xl md:text-2xl text-white/90 mb-8 leading-relaxed">
              We blend innovative marketing techniques, cutting-edge technologies, and transformative strategies to create impactful and tailored solutions for clients.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/contact"
                className="bg-white text-primary-600 hover:bg-gray-100 font-semibold py-4 px-8 rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl"
              >
                Get Started
              </Link>
              <Link
                href="/portfolios"
                className="bg-white/10 backdrop-blur-sm text-white border-2 border-white hover:bg-white/20 font-semibold py-4 px-8 rounded-lg transition-all duration-300"
              >
                View Our Work
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Vision & Mission */}
      <section className="section-padding bg-white">
        <div className="container-custom">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="bg-gradient-to-br from-primary-50 to-secondary-50 p-8 rounded-2xl"
            >
              <div className="flex items-center space-x-4 mb-6">
                <Target className="w-10 h-10 text-primary-600" />
                <h2 className="text-3xl font-bold text-gray-900">Our Vision</h2>
              </div>
              <p className="text-lg text-gray-700 leading-relaxed">
                To be the driving force behind businesses' success in a dynamic and ever-evolving market landscape.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="bg-gradient-to-br from-secondary-50 to-primary-50 p-8 rounded-2xl"
            >
              <div className="flex items-center space-x-4 mb-6">
                <Zap className="w-10 h-10 text-secondary-600" />
                <h2 className="text-3xl font-bold text-gray-900">Our Mission</h2>
              </div>
              <p className="text-lg text-gray-700 leading-relaxed">
                To harness the power of marketing as the catalyst for change and innovation, empowering businesses to thrive and define their existence in the marketplace.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="section-padding bg-gray-50">
        <div className="container-custom">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="text-center"
              >
                <div className="text-4xl md:text-5xl font-bold text-primary-600 mb-2">
                  {stat.value}
                </div>
                <div className="text-gray-600 font-medium">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Services Section */}
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
              Our Services
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Comprehensive marketing services designed to meet the needs of businesses of all sizes
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
                className="bg-white p-6 rounded-xl shadow-lg hover:shadow-2xl transition-shadow duration-300 border border-gray-100"
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
      <section className="section-padding bg-gray-50">
        <div className="container-custom">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="max-w-4xl mx-auto"
          >
            <h2 className="text-3xl font-bold mb-6 text-gray-900 text-center">Market Research & Analysis</h2>
            <p className="text-lg text-gray-600 mb-8 text-center max-w-2xl mx-auto">
              We conduct in-depth research to understand your target audience, your competitors, and current marketing trends. This data analysis allows us to develop effective marketing strategies.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {marketResearchServices.map((item, index) => (
                <motion.div
                  key={item}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  className="flex items-center space-x-3 bg-white p-4 rounded-lg shadow-md"
                >
                  <CheckCircle className="w-6 h-6 text-primary-600 flex-shrink-0" />
                  <span className="text-gray-700">{item}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Milestones Section */}
      <section className="section-padding bg-white">
        <div className="container-custom">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-secondary-600">
              Milestones
            </h2>
            <div className="w-24 h-1 bg-gray-300 mx-auto"></div>
          </motion.div>

          <div className="relative max-w-7xl mx-auto">
            {/* Milestones - 2 rows for better layout */}
            <div className="relative grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-8 md:gap-6">
              {/* 2018 Milestone */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="relative flex flex-col items-center text-center"
              >
                <div className="relative z-10 mb-6">
                  <div className="w-20 h-20 rounded-full border-4 border-secondary-600 bg-white flex items-center justify-center shadow-lg">
                    <div className="w-16 h-16 rounded-full border-4 border-gray-300 bg-white flex items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center">
                        <span className="text-xl font-bold text-gray-900">2018</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg max-w-xs">
                  <p className="text-gray-700 leading-relaxed text-sm">
                    Changer Fusions Enterprise was founded, beginning our journey as a marketing strategic partner with a vision to blend innovative marketing techniques and transformative strategies.
                  </p>
                </div>
                {/* Arrow pointing to next milestone */}
                <div className="absolute top-[60px] -right-4 md:-right-6 lg:-right-8 z-20 hidden md:block">
                  <ArrowRight className="w-8 h-8 text-primary-600" />
                </div>
              </motion.div>

              {/* 2019 Milestone */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="relative flex flex-col items-center text-center"
              >
                <div className="relative z-10 mb-6">
                  <div className="w-20 h-20 rounded-full border-4 border-secondary-600 bg-white flex items-center justify-center shadow-lg">
                    <div className="w-16 h-16 rounded-full border-4 border-gray-300 bg-white flex items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center">
                        <span className="text-xl font-bold text-gray-900">2019</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg max-w-xs">
                  <p className="text-gray-700 leading-relaxed text-sm">
                    Launched our first digital marketing campaigns and established partnerships with local businesses, setting the foundation for our comprehensive marketing services.
                  </p>
                </div>
                {/* Arrow pointing to next milestone */}
                <div className="absolute top-[60px] -right-4 md:-right-6 lg:-right-8 z-20 hidden md:block">
                  <ArrowRight className="w-8 h-8 text-primary-600" />
                </div>
              </motion.div>

              {/* 2020 Milestone */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="relative flex flex-col items-center text-center"
              >
                <div className="relative z-10 mb-6">
                  <div className="w-20 h-20 rounded-full border-4 border-secondary-600 bg-white flex items-center justify-center shadow-lg">
                    <div className="w-16 h-16 rounded-full border-4 border-gray-300 bg-white flex items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center">
                        <span className="text-xl font-bold text-gray-900">2020</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg max-w-xs">
                  <p className="text-gray-700 leading-relaxed text-sm">
                    Expanded our services to include website development and design, helping businesses establish their online presence during a critical period of digital transformation.
                  </p>
                </div>
                {/* Arrow pointing to next milestone */}
                <div className="absolute top-[60px] -right-4 md:-right-6 lg:-right-8 z-20 hidden md:block">
                  <ArrowRight className="w-8 h-8 text-primary-600" />
                </div>
              </motion.div>

              {/* 2021 Milestone */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="relative flex flex-col items-center text-center"
              >
                <div className="relative z-10 mb-6">
                  <div className="w-20 h-20 rounded-full border-4 border-secondary-600 bg-white flex items-center justify-center shadow-lg">
                    <div className="w-16 h-16 rounded-full border-4 border-gray-300 bg-white flex items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center">
                        <span className="text-xl font-bold text-gray-900">2021</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg max-w-xs">
                  <p className="text-gray-700 leading-relaxed text-sm">
                    Introduced branding and creative services, helping businesses develop strong brand identities and visual communication strategies.
                  </p>
                </div>
                {/* Arrow pointing to next milestone */}
                <div className="absolute top-[60px] -right-4 md:-right-6 lg:-right-8 z-20 hidden md:block">
                  <ArrowRight className="w-8 h-8 text-primary-600" />
                </div>
              </motion.div>

              {/* 2022 Milestone */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="relative flex flex-col items-center text-center"
              >
                <div className="relative z-10 mb-6">
                  <div className="w-20 h-20 rounded-full border-4 border-secondary-600 bg-white flex items-center justify-center shadow-lg">
                    <div className="w-16 h-16 rounded-full border-4 border-gray-300 bg-white flex items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center">
                        <span className="text-xl font-bold text-gray-900">2022</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg max-w-xs">
                  <p className="text-gray-700 leading-relaxed text-sm">
                    Launched market research and analysis services, providing data-driven insights to help businesses make informed marketing decisions.
                  </p>
                </div>
                {/* Arrow pointing to next milestone */}
                <div className="absolute top-[60px] -right-4 md:-right-6 lg:-right-8 z-20 hidden md:block">
                  <ArrowRight className="w-8 h-8 text-primary-600" />
                </div>
              </motion.div>

              {/* 2023 Milestone */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.5 }}
                className="relative flex flex-col items-center text-center"
              >
                <div className="relative z-10 mb-6">
                  <div className="w-20 h-20 rounded-full border-4 border-secondary-600 bg-white flex items-center justify-center shadow-lg">
                    <div className="w-16 h-16 rounded-full border-4 border-gray-300 bg-white flex items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center">
                        <span className="text-xl font-bold text-gray-900">2023</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg max-w-xs">
                  <p className="text-gray-700 leading-relaxed text-sm">
                    Expanded into events marketing with the launch of The Coast Fashion and Modeling Awards, establishing our presence in the events sector.
                  </p>
                </div>
                {/* Arrow pointing to next milestone */}
                <div className="absolute top-[60px] -right-4 md:-right-6 lg:-right-8 z-20 hidden md:block">
                  <ArrowRight className="w-8 h-8 text-primary-600" />
                </div>
              </motion.div>

              {/* 2024 Milestone */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.6 }}
                className="relative flex flex-col items-center text-center"
              >
                <div className="relative z-10 mb-6">
                  <div className="w-20 h-20 rounded-full border-4 border-secondary-600 bg-white flex items-center justify-center shadow-lg">
                    <div className="w-16 h-16 rounded-full border-4 border-gray-300 bg-white flex items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center">
                        <span className="text-xl font-bold text-gray-900">2024</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg max-w-xs">
                  <p className="text-gray-700 leading-relaxed text-sm">
                    A successful year with multiple events including Mr and Miss Mombasa International Show, Marketing Society of Kenya workshops, King Experience live concert, corporate partnerships, educational forums, and student engagement events.
                  </p>
                </div>
                {/* Arrow pointing to next milestone */}
                <div className="absolute top-[60px] -right-4 md:-right-6 lg:-right-8 z-20 hidden md:block">
                  <ArrowRight className="w-8 h-8 text-primary-600" />
                </div>
              </motion.div>

              {/* 2025 Milestone */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.7 }}
                className="relative flex flex-col items-center text-center"
              >
                <div className="relative z-10 mb-6">
                  <div className="w-20 h-20 rounded-full border-4 border-secondary-600 bg-white flex items-center justify-center shadow-lg">
                    <div className="w-16 h-16 rounded-full border-4 border-gray-300 bg-white flex items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center">
                        <span className="text-xl font-bold text-gray-900">2025</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg max-w-xs">
                  <p className="text-gray-700 leading-relaxed text-sm">
                    Launching the Changer Fusions Enterprise Gala Awards 2025, an immersive journey for young leaders and creatives focused on sustainable fashion, leadership, and climate advocacy.
                  </p>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* What Makes Us Different */}
      <section className="section-padding bg-gray-50">
        <div className="container-custom">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-4xl font-bold mb-6 text-gray-900">
                What Makes Us Different?
              </h2>
              <p className="text-lg text-gray-700 mb-6 leading-relaxed">
                Changer Fusions Enterprise's focus on "blending innovative marketing techniques" suggests we stay on top of the latest marketing trends and integrate them into our strategies. Our motto highlights our proactive approach, emphasizing the importance of marketing for business success.
              </p>
              <p className="text-lg text-gray-700 leading-relaxed">
                With a focus on harnessing the power of change and innovation, CMF drives meaningful results and facilitates growth in an ever-evolving marketing landscape. We create impactful and tailored solutions that help businesses thrive and define their existence in the marketplace.
              </p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="bg-gradient-to-br from-primary-100 to-secondary-100 p-8 rounded-2xl"
            >
              <div className="space-y-6">
                <div className="bg-white p-6 rounded-lg shadow-lg">
                  <div className="text-3xl font-bold text-primary-600 mb-2">Innovation</div>
                  <div className="text-gray-600">Blending cutting-edge techniques</div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-lg">
                  <div className="text-3xl font-bold text-secondary-600 mb-2">Transformation</div>
                  <div className="text-gray-600">Catalyst for change and growth</div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-lg">
                  <div className="text-3xl font-bold text-accent-600 mb-2">Excellence</div>
                  <div className="text-gray-600">Tailored solutions for success</div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="section-padding bg-gradient-to-r from-primary-600 via-secondary-600 to-primary-600">
        <div className="container-custom">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-3xl mx-auto"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Ready to Thrive in the Marketplace?
            </h2>
            <p className="text-xl text-white/90 mb-8">
              Let Changer Fusions Enterprise help you harness the power of marketing as the catalyst for change and innovation. Contact us today to create impactful solutions for your business.
            </p>
            <Link
              href="/contact"
              className="inline-block bg-white text-primary-600 hover:bg-gray-100 font-semibold py-4 px-8 rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              Start Your Marketing Journey
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
