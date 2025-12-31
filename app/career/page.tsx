"use client";

import { motion } from "framer-motion";
import { TrendingUp, Users, Target, Briefcase, ArrowRight, CheckCircle, Network, BookOpen, Award } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

const careerServices = [
  {
    icon: Briefcase,
    title: "Career Counseling",
    description: "Personalized career guidance to help you identify your strengths, set goals, and create a strategic career path.",
    features: [
      "Career assessment and analysis",
      "Goal setting and planning",
      "Skills gap identification",
      "Industry insights and trends",
    ],
  },
  {
    icon: Network,
    title: "Professional Networking",
    description: "Connect with industry professionals, mentors, and peers to expand your professional network.",
    features: [
      "Networking events and mixers",
      "Industry meetups",
      "Mentorship programs",
      "Online networking platform",
    ],
  },
  {
    icon: BookOpen,
    title: "Skill Development",
    description: "Access to training programs, workshops, and resources to enhance your professional skills.",
    features: [
      "Professional development courses",
      "Workshop series",
      "Online learning resources",
      "Certification programs",
    ],
  },
  {
    icon: Target,
    title: "Job Placement Support",
    description: "Comprehensive support in finding and securing your next career opportunity.",
    features: [
      "Resume and CV optimization",
      "Interview preparation",
      "Job search strategies",
      "Application tracking",
    ],
  },
  {
    icon: Award,
    title: "Career Advancement",
    description: "Strategies and support to help you advance in your current role or transition to new opportunities.",
    features: [
      "Performance improvement plans",
      "Leadership development",
      "Promotion strategies",
      "Career transition support",
    ],
  },
  {
    icon: Users,
    title: "Professional Branding",
    description: "Build and enhance your professional brand to stand out in the job market.",
    features: [
      "LinkedIn profile optimization",
      "Personal website development",
      "Portfolio creation",
      "Online presence management",
    ],
  },
];

const successStories = [
  {
    name: "John Mwangi",
    role: "Marketing Manager",
    company: "Tech Solutions Ltd",
    image: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892256/IMG_0331_zz7s2k.jpg",
    quote: "The career development program helped me transition from a junior role to a management position within 18 months.",
  },
  {
    name: "Grace Wanjiku",
    role: "Senior Web Developer",
    company: "Digital Innovations",
    image: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892261/IMG_9817_qlxozr.jpg",
    quote: "Through their networking events and skill development programs, I found my dream job and expanded my professional network significantly.",
  },
  {
    name: "Peter Omondi",
    role: "Event Coordinator",
    company: "Premier Events Kenya",
    image: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892258/IMG_0373_e07xid.jpg",
    quote: "The career counseling and training programs gave me the confidence and skills to start my own event planning business.",
  },
];

const stats = [
  { value: "500+", label: "Career Transitions" },
  { value: "1,200+", label: "Networking Connections" },
  { value: "85%", label: "Success Rate" },
  { value: "300+", label: "Job Placements" },
];

export default function CareerDevelopmentPage() {
  return (
    <div className="pt-20 min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="relative section-padding overflow-hidden min-h-[400px] md:min-h-[500px] flex items-center">
        {/* Background Image */}
        <div className="absolute inset-0">
          <Image
            src="https://res.cloudinary.com/dyfnobo9r/image/upload/v1765955877/WhatsApp_Image_2025-12-17_at_9.32.55_AM_pbzaj5.jpg"
            alt="Career Development"
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
            <h1 className="text-4xl md:text-6xl font-bold mb-6 text-white">
              Career Development
            </h1>
            <p className="text-xl text-white/90 leading-relaxed mb-8">
              Grow your professional network and advance your career with our comprehensive career development services. 
              From career counseling to networking opportunities, we're here to support your professional journey.
            </p>
            <div className="flex flex-row gap-4 justify-center">
              <Link href="/contact" className="w-full sm:w-auto btn-primary inline-flex items-center justify-center">
                Get Started
                <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
              <Link href="/jobs" className="w-full sm:w-auto btn-outline inline-flex items-center justify-center">
                Browse Jobs
                <Briefcase className="ml-2 w-5 h-5" />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="section-padding bg-white">
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
              Our Career Development Services
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Comprehensive support for every stage of your career journey
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {careerServices.map((service, index) => (
              <motion.div
                key={service.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow"
              >
                <div className="w-14 h-14 rounded-lg bg-gradient-to-r from-primary-500 to-secondary-500 flex items-center justify-center mb-4">
                  <service.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-2xl font-bold mb-3 text-gray-900">{service.title}</h3>
                <p className="text-gray-600 mb-4">{service.description}</p>
                <ul className="space-y-2">
                  {service.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start text-sm text-gray-700">
                      <CheckCircle className="w-5 h-5 text-primary-600 mr-2 flex-shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Success Stories */}
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
              Success Stories
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Real stories from professionals who've advanced their careers with us
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {successStories.map((story, index) => (
              <motion.div
                key={story.name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-gray-50 p-6 rounded-xl"
              >
                <div className="flex items-center mb-4">
                  <div className="relative w-16 h-16 rounded-full overflow-hidden mr-4">
                    <Image
                      src={story.image}
                      alt={story.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div>
                    <div className="font-bold text-gray-900">{story.name}</div>
                    <div className="text-sm text-gray-600">{story.role}</div>
                    <div className="text-sm text-primary-600">{story.company}</div>
                  </div>
                </div>
                <p className="text-gray-700 italic">"{story.quote}"</p>
              </motion.div>
            ))}
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
              Ready to Advance Your Career?
            </h2>
            <p className="text-xl text-white/90 mb-8">
              Join our career development program and take the next step in your professional journey.
            </p>
            <Link
              href="/contact"
              className="inline-block bg-white text-primary-600 hover:bg-gray-100 font-semibold py-4 px-8 rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              Get Started Today
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
}

