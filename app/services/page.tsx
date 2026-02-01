"use client";

import { motion } from "framer-motion";
import { TrendingUp, Globe, Award, Target, Users, Lightbulb, Mail, Phone, MapPin } from "lucide-react";
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
    <div className="pt-28 md:pt-32 min-h-screen bg-white">
      <div className="container-custom py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Main */}
          <main className="lg:col-span-8">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="text-sm font-bold tracking-widest text-gray-500 uppercase">Services</div>
              <h1 className="mt-3 text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight">
                Marketing services built to help you grow
              </h1>
              <p className="mt-4 text-gray-600 leading-relaxed max-w-3xl">
                Explore our core services — from digital marketing and website development to branding, research, events,
                and content creation.
              </p>
            </motion.div>

            <div className="mt-10 space-y-10">
              <section className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                <div className="p-6 md:p-8 border-b border-gray-200">
                  <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900">Our Services</h2>
                  <p className="mt-2 text-gray-600">
                    A clear breakdown of what we offer — similar to a venue “rooms & spaces” listing.
                  </p>
                </div>

                <div className="divide-y divide-gray-200">
                  {services.map((service) => (
                    <div key={service.href} className="p-6 md:p-8">
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-primary-600/10 text-primary-700 grid place-items-center">
                          <service.icon className="w-6 h-6" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-4 flex-wrap">
                            <h3 className="text-xl md:text-2xl font-extrabold text-gray-900">
                              {service.title}
                            </h3>
                            <Link
                              href={service.href}
                              className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-gray-900 font-semibold px-4 py-2"
                            >
                              View details
                            </Link>
                          </div>
                          <p className="mt-2 text-gray-700 leading-relaxed">{service.description}</p>
                          <ul className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2 text-gray-700">
                            {service.features.map((feature) => (
                              <li key={feature} className="flex items-start gap-3">
                                <span className="mt-2 h-1.5 w-1.5 rounded-full bg-secondary-600 flex-shrink-0" />
                                <span>{feature}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </main>

          {/* Sidebar */}
          <aside className="lg:col-span-4">
            <div className="sticky top-24 rounded-2xl border border-gray-200 bg-gray-50 p-6 shadow-sm">
              <div className="text-sm font-bold tracking-widest text-gray-500 uppercase">Get in touch</div>
              <h2 className="mt-2 text-2xl font-extrabold text-gray-900">Talk to our team</h2>
              <p className="mt-2 text-gray-600 leading-relaxed">
                Need a proposal or want to discuss a service? Reach us via phone or email.
              </p>

              <div className="mt-6 space-y-3 text-gray-700">
                <div className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-primary-700" />
                  <span className="font-semibold">+254 797 777347</span>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-primary-700" />
                  <span className="font-semibold">info@cmfagency.co.ke</span>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-primary-700 mt-0.5" />
                  <span className="text-sm leading-relaxed">
                    AMBALAL BUILDING, NKRUMA ROAD, MOMBASA
                  </span>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                <Link href="/contact" className="btn-primary w-full inline-flex items-center justify-center">
                  Contact Us
                </Link>
                <Link
                  href="/events/upcoming"
                  className="w-full inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-gray-900 font-semibold px-4 py-3"
                >
                  View upcoming events
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

