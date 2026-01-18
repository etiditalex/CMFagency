"use client";

import { motion } from "framer-motion";
import { Globe, CheckCircle, ArrowRight, ChevronRight } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

const pastWebsiteWork = [
  {
    name: "The WAK Movement",
    url: "https://thewalkmovement.co.ke",
    image:
      "https://res.cloudinary.com/dyfnobo9r/image/upload/v1768656538/Mombasa_walk_movement_lzpfyc.jpg",
  },
  {
    name: "CMFAgency",
    url: "https://cmfagency.co.ke",
    image:
      "https://res.cloudinary.com/dyfnobo9r/image/upload/v1768656538/changer_fusions_2_meko70.jpg",
  },
  {
    name: "Lemach",
    url: "https://lemach.co.ke",
    image:
      "https://res.cloudinary.com/dyfnobo9r/image/upload/v1768656538/Lemach_shdvuz.jpg",
  },
  {
    name: "Inuka Properties",
    url: "https://inukaproperties.co.ke",
    image:
      "https://res.cloudinary.com/dyfnobo9r/image/upload/v1768656538/inuka_properties_eamfm1.jpg",
  },
  {
    name: "Duncun Motanya",
    url: "https://iamduncun.co.ke",
    image:
      "https://res.cloudinary.com/dyfnobo9r/image/upload/v1768656538/duncun_motanya_cfixre.jpg",
  },
  {
    name: "Major Idris (Portfolio)",
    url: "https://etiditalex.github.io/Major-Idris/",
    image:
      "https://res.cloudinary.com/dyfnobo9r/image/upload/v1768656538/major_idris_2_pnlyxh.jpg",
  },
  {
    name: "Kilifi Properties",
    url: "https://kilifiproperties.co.ke",
    image:
      "https://res.cloudinary.com/dyfnobo9r/image/upload/v1768656538/Kilifi_properties_za798m.jpg",
  },
];

const servicesNav = [
  { label: "ALL SERVICES", href: "/services" },
  { label: "DIGITAL MARKETING", href: "/services/digital-marketing" },
  { label: "WEBSITE DEVELOPMENT", href: "/services/website-development" },
  { label: "BRANDING", href: "/services/branding" },
  { label: "MARKET RESEARCH", href: "/services/market-research" },
  { label: "EVENTS MARKETING", href: "/services/events-marketing" },
  { label: "CONTENT CREATION", href: "/services/content-creation" },
];

const features = [
  "Custom Website Design",
  "Responsive Web Development",
  "E-commerce Solutions",
  "Content Management Systems",
  "Website Maintenance & Support",
  "Performance Optimization",
  "SEO-Friendly Development",
  "Mobile-First Design",
];

const benefits = [
  "Visually appealing and user-friendly websites",
  "Fast loading times and optimal performance",
  "Mobile-responsive across all devices",
  "Easy content management",
  "Scalable solutions for business growth",
];

export default function WebsiteDevelopmentPage() {
  return (
    <div className="pt-28 md:pt-32 min-h-screen bg-gray-50">
      {/* Breadcrumb */}
      <div className="bg-white border-b border-gray-200">
        <div className="w-full px-4 sm:px-6 lg:px-10 xl:px-14 2xl:px-16 py-4">
          <div className="text-sm text-gray-600">
            <Link href="/" className="hover:text-secondary-600">
              CHANGER FUSIONS
            </Link>
            {" > "}
            <Link href="/services" className="hover:text-secondary-600">
              SERVICES
            </Link>
            {" > "}
            <span className="text-gray-900 font-semibold">WEBSITE DEVELOPMENT</span>
          </div>
        </div>
      </div>

      <div className="w-full px-4 sm:px-6 lg:px-10 xl:px-14 2xl:px-16 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
          {/* Sidebar */}
          <aside className="lg:col-span-1">
            <div className="bg-white border-2 border-secondary-600 rounded-lg p-6 sticky top-24">
              <h2 className="text-xl font-bold text-gray-900 mb-6">SERVICES</h2>
              <nav className="space-y-2">
                {servicesNav.map((item) => {
                  const isActive = item.href === "/services/website-development";
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={[
                        "block transition-colors duration-200",
                        isActive
                          ? "text-secondary-600 font-semibold flex items-center space-x-2"
                          : "text-gray-700 hover:text-secondary-600 flex items-center space-x-2",
                      ].join(" ")}
                    >
                      <ChevronRight className="w-4 h-4" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>

              {/* Vision, Mission, and Core Values (consistent with About pages) */}
              <div className="mt-8 pt-8 border-t border-gray-200">
                <h3 className="text-lg font-bold text-gray-900 mb-4">OUR VISION</h3>
                <p className="text-gray-700 text-sm leading-relaxed mb-6">
                  To be the driving force behind businesses' success in a dynamic and ever-evolving
                  market landscape.
                </p>
                <h3 className="text-lg font-bold text-gray-900 mb-4">OUR MISSION</h3>
                <p className="text-gray-700 text-sm leading-relaxed mb-6">
                  To harness marketing as the catalyst for change and innovation, empowering
                  businesses to thrive and define their existence in the marketplace.
                </p>
                <h3 className="text-lg font-bold text-gray-900 mb-4">CORE VALUES</h3>
                <ul className="space-y-3">
                  {[
                    {
                      title: "Innovation",
                      desc: "We embrace creativity, emerging trends, and modern technologies.",
                    },
                    {
                      title: "Integrity",
                      desc: "We operate with honesty, transparency, and accountability.",
                    },
                    {
                      title: "Excellence",
                      desc: "We are committed to the highest standards of quality and professionalism.",
                    },
                    {
                      title: "Client-Centricity",
                      desc: "Our clients' goals are at the center of everything we do.",
                    },
                    {
                      title: "Impact & Results",
                      desc: "We focus on outcomes and measurable impact for our clients.",
                    },
                  ].map((v) => (
                    <li key={v.title} className="flex items-start space-x-2">
                      <div className="flex-shrink-0 mt-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-secondary-600"></div>
                      </div>
                      <span className="text-gray-700 text-sm leading-relaxed">
                        <strong className="text-gray-900">{v.title}:</strong> {v.desc}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </aside>

          {/* Main content */}
          <main className="lg:col-span-3">
            {/* Header image card */}
            <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="relative aspect-[16/7] min-h-[260px] bg-gradient-to-br from-primary-700 via-secondary-600 to-primary-800">
                <div className="absolute inset-0 bg-black/15" />

                <div className="absolute inset-0 flex items-end p-6 md:p-8">
                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.55 }}
                    className="max-w-3xl"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-11 h-11 bg-white/15 backdrop-blur-sm rounded-full flex items-center justify-center">
                        <Globe className="w-6 h-6 text-white" />
                      </div>
                      <span className="text-white/90 text-sm font-semibold tracking-wide">
                        WEB DEVELOPMENT
                      </span>
                    </div>
                    <h1 className="text-3xl md:text-4xl font-extrabold text-white">
                      Website Development & Design
                    </h1>
                    <p className="mt-3 text-white/90 leading-relaxed">
                      Create custom websites that are visually appealing, user-friendly, and built to
                      perform. We also offer ongoing maintenance so your website stays secure,
                      modern, and reliable.
                    </p>
                  </motion.div>
                </div>
              </div>
            </div>

            <div className="mt-10 space-y-10">
              {/* Features */}
              <section className="bg-white border border-gray-200 rounded-xl p-6 md:p-8 shadow-sm">
                <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-wide">
                  OUR WEBSITE DEVELOPMENT SERVICES
                </h2>
                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {features.map((feature, index) => (
                    <motion.div
                      key={feature}
                      initial={{ opacity: 0, x: -10 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.45, delay: index * 0.03 }}
                      className="flex items-start gap-3 rounded-lg bg-gray-50 p-4"
                    >
                      <CheckCircle className="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-800 font-medium">{feature}</span>
                    </motion.div>
                  ))}
                </div>
              </section>

              {/* Benefits */}
              <section className="bg-white border border-gray-200 rounded-xl p-6 md:p-8 shadow-sm">
                <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-wide">
                  WHY CHOOSE OUR WEB DEVELOPMENT?
                </h2>
                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {benefits.map((benefit, index) => (
                    <motion.div
                      key={benefit}
                      initial={{ opacity: 0, y: 14 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.45, delay: index * 0.04 }}
                      className="bg-gray-50 border border-gray-100 rounded-xl p-5"
                    >
                      <p className="text-gray-700 leading-relaxed">{benefit}</p>
                    </motion.div>
                  ))}
                </div>
              </section>

              {/* Past Website Work */}
              <section className="bg-white border border-gray-200 rounded-xl p-6 md:p-8 shadow-sm">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-wide">
                      OUR PAST WEBSITE WORK
                    </h2>
                    <p className="mt-2 text-gray-600">
                      A few websites we’ve designed and developed for brands and businesses.
                    </p>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {pastWebsiteWork.map((site, index) => (
                    <motion.a
                      key={site.url}
                      href={site.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      initial={{ opacity: 0, y: 14 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.45, delay: index * 0.04 }}
                      className="group block rounded-2xl overflow-hidden border border-gray-100 bg-white shadow-sm hover:shadow-xl transition-shadow duration-300"
                    >
                      <div className="relative w-full aspect-[16/10] overflow-hidden">
                        <Image
                          src={site.image}
                          alt={`${site.name} website preview`}
                          fill
                          className="object-cover object-center transition-transform duration-500 group-hover:scale-105"
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/35 transition-colors duration-300" />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <div className="inline-flex items-center gap-2 rounded-full bg-white/95 px-5 py-2 text-sm font-semibold text-gray-900 shadow-lg">
                            <span>View Website</span>
                            <ArrowRight className="w-4 h-4" />
                          </div>
                        </div>
                      </div>

                      <div className="p-5">
                        <h3 className="text-lg font-bold text-gray-900">{site.name}</h3>
                        <p className="text-sm text-gray-500 mt-1">{site.url}</p>
                      </div>
                    </motion.a>
                  ))}
                </div>
              </section>

              {/* CTA */}
              <section className="p-8 bg-gradient-to-br from-primary-600 to-secondary-600 rounded-2xl text-white">
                <h2 className="text-2xl md:text-3xl font-extrabold mb-3">
                  Ready to Build Your Online Presence?
                </h2>
                <p className="text-white/90 leading-relaxed max-w-2xl">
                  Let&apos;s create a website that represents your brand and drives results.
                </p>
                <div className="mt-6">
                  <Link
                    href="/contact"
                    className="inline-flex items-center gap-2 bg-white text-primary-700 hover:bg-gray-100 font-semibold py-3 px-6 rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl"
                  >
                    <span>Get Started</span>
                    <ArrowRight className="w-5 h-5" />
                  </Link>
                </div>
              </section>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

