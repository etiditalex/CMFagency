"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, CheckCircle, ChevronRight, type LucideIcon } from "lucide-react";

const SERVICES_NAV = [
  { label: "ALL SERVICES", href: "/services" },
  { label: "DIGITAL MARKETING", href: "/services/digital-marketing" },
  { label: "WEBSITE DEVELOPMENT", href: "/services/website-development" },
  { label: "BRANDING", href: "/services/branding" },
  { label: "MARKET RESEARCH", href: "/services/market-research" },
  { label: "EVENTS MARKETING", href: "/services/events-marketing" },
  { label: "CONTENT CREATION", href: "/services/content-creation" },
];

type ServiceDetailTemplateProps = {
  activeHref: string;
  title: string;
  heroLabel: string;
  description: string;
  featuresTitle: string;
  features: string[];
  benefitsTitle: string;
  benefits: string[];
  ctaTitle: string;
  ctaDescription: string;
  icon: LucideIcon;
};

export default function ServiceDetailTemplate({
  activeHref,
  title,
  heroLabel,
  description,
  featuresTitle,
  features,
  benefitsTitle,
  benefits,
  ctaTitle,
  ctaDescription,
  icon: Icon,
}: ServiceDetailTemplateProps) {
  return (
    <div className="pt-28 md:pt-32 min-h-screen bg-gray-50">
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
            <span className="text-gray-900 font-semibold">{title.toUpperCase()}</span>
          </div>
        </div>
      </div>

      <div className="w-full px-4 sm:px-6 lg:px-10 xl:px-14 2xl:px-16 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
          <aside className="lg:col-span-1">
            <div className="bg-white border-2 border-secondary-600 rounded-lg p-6 sticky top-24">
              <h2 className="text-xl font-bold text-gray-900 mb-6">SERVICES</h2>
              <nav className="space-y-2">
                {SERVICES_NAV.map((item) => {
                  const isActive = item.href === activeHref;
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
            </div>
          </aside>

          <main className="lg:col-span-3">
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
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <span className="text-white/90 text-sm font-semibold tracking-wide">{heroLabel}</span>
                    </div>
                    <h1 className="text-3xl md:text-4xl font-extrabold text-white">{title}</h1>
                    <p className="mt-3 text-white/90 leading-relaxed">{description}</p>
                  </motion.div>
                </div>
              </div>
            </div>

            <div className="mt-10 space-y-10">
              <section className="bg-white border border-gray-200 rounded-xl p-6 md:p-8 shadow-sm">
                <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-wide">{featuresTitle}</h2>
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

              <section className="bg-white border border-gray-200 rounded-xl p-6 md:p-8 shadow-sm">
                <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-wide">{benefitsTitle}</h2>
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

              <section className="p-8 bg-gradient-to-br from-primary-600 to-secondary-600 rounded-2xl text-white">
                <h2 className="text-2xl md:text-3xl font-extrabold mb-3">{ctaTitle}</h2>
                <p className="text-white/90 leading-relaxed max-w-2xl">{ctaDescription}</p>
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
