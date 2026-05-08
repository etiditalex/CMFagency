"use client";

import { motion } from "framer-motion";
import {
  CheckCircle,
  ArrowRight,
  LayoutTemplate,
  ShoppingCart,
  Code2,
  Blocks,
  Search,
  Gauge,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";

const faqItems = [
  {
    question: "Do you offer website development in Mombasa?",
    answer:
      "Yes. Changer Fusions builds websites for businesses in Mombasa and across Kenya, including custom websites, CMS builds, and e-commerce stores.",
  },
  {
    question: "What technologies do you use to build websites?",
    answer:
      "We build modern, performance-focused websites using the right stack for your goals. Common options include Next.js for fast marketing sites and custom web apps, plus CMS solutions when you need easy content updates.",
  },
  {
    question: "Will my website be mobile responsive and SEO-friendly?",
    answer:
      "Yes. We use mobile-first layouts and SEO best practices like fast loading, clean structure, and metadata so your site is easy for users and search engines to understand.",
  },
  {
    question: "Can you build an e-commerce website?",
    answer:
      "Yes. We design and develop e-commerce websites with product catalogs, checkout flows, and integrations that fit your business needs.",
  },
  {
    question: "Do you provide website maintenance and support?",
    answer:
      "Yes. We can provide ongoing maintenance, updates, and support to keep your website secure, reliable, and up to date.",
  },
];

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

const tableOfContents = [
  "Custom Web Development in Mombasa",
  "Customized Website Development Services in Kenya",
  "Web Design",
  "eCommerce Web Design",
  "Web Application Development",
  "CMS Development",
  "SEO Services",
  "Website Speed Optimization",
  "Here’s what you need to know about custom websites",
  "Custom Websites FAQs",
  "Testimonials",
  "What Customers Say About Our Services",
];

const customizedWebsiteDevelopmentServices = [
  "Custom eCommerce Design",
  "Custom Website Redesign",
  "Custom Web App Design",
  "Custom Website End-to-End Design",
  "Custom website design",
  "Responsive design",
  "E-commerce web design",
  "UI/UX design",
  "Landing page design",
  "Search Engine Optimization",
  "Website maintenance and support",
];

const webDevCards = [
  {
    title: "Web Design",
    description:
      "Get a custom web design at an affordable price. Our designs are fully responsive and optimized to work on all devices.",
    icon: LayoutTemplate,
  },
  {
    title: "eCommerce Web Design",
    description:
      "Our expert web developers will help you choose the correct eCommerce platform and design a store that converts.",
    icon: ShoppingCart,
  },
  {
    title: "Web Application Development",
    description:
      "We develop web applications that are powerful such as ecommerce portals, business portals, CMSs and custom business apps.",
    icon: Code2,
  },
  {
    title: "CMS Development",
    description:
      "We develop custom WordPress and headless CMS solutions so you can manage changes and updates easily without technical knowhow.",
    icon: Blocks,
  },
  {
    title: "SEO Services",
    description:
      "After developing a website you will want it to rank better in search engines. Our SEO services ensure your custom website is optimized for search.",
    icon: Search,
  },
  {
    title: "Website Speed Optimization",
    description:
      "If your website loading speed is low, we will help optimize your website to get your website loading fast on both desktop and mobile.",
    icon: Gauge,
  },
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
        <div className="grid grid-cols-1">
          <main>
            <script
              type="application/ld+json"
              dangerouslySetInnerHTML={{
                __html: JSON.stringify({
                  "@context": "https://schema.org",
                  "@type": "FAQPage",
                  mainEntity: faqItems.map((f) => ({
                    "@type": "Question",
                    name: f.question,
                    acceptedAnswer: {
                      "@type": "Answer",
                      text: f.answer,
                    },
                  })),
                }),
              }}
            />
            {/* Header image card */}
            <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="relative aspect-[16/7] min-h-[260px] bg-gray-900">
                <div
                  className="absolute inset-0 bg-cover bg-center"
                  style={{
                    backgroundImage:
                      "url(https://res.cloudinary.com/dyfnobo9r/image/upload/v1778223309/website_development_yk0lia.jpg)",
                  }}
                />
                <div className="absolute inset-0 bg-black/55" />

                <div className="absolute inset-0 flex items-end p-6 md:p-8">
                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.55 }}
                    className="max-w-3xl"
                  >
                    <h1 className="text-3xl md:text-4xl font-extrabold text-white">
                      Website Development & Design
                    </h1>
                  </motion.div>
                </div>
              </div>
            </div>

            <div className="mt-10 space-y-10">
              {/* Intro + Table of Contents */}
              <section className="bg-white border border-gray-200 rounded-xl p-6 md:p-8 shadow-sm">
                <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-wide">
                  Custom Web Development in Mombasa
                </h2>
                <p className="mt-3 text-gray-600 leading-relaxed">
                  We are a custom website development company in Kenya that offers bespoke website
                  development services to our clients. We know how to develop a custom website that
                  is impactful to your business and ready to help you achieve that.
                </p>

                <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50/40 p-5 md:p-6">
                  <div className="text-lg font-extrabold text-gray-900">Table of Contents</div>
                  <ol className="mt-3 space-y-1.5 text-sm text-gray-800 list-decimal pl-5">
                    {tableOfContents.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ol>
                </div>

                <div className="mt-6 space-y-4 text-gray-700 leading-relaxed">
                  <p>
                    To those who may be wondering what a custom website is and the difference from
                    any other website, a custom website is built to the company&apos;s exact needs,
                    preferences and designs of their choice.
                  </p>
                  <p>
                    A custom website designer is usually done by experienced developers who most of
                    the time spend a lot of time with a company team or project manager to understand
                    whatever needs the company has that could be reflected in the website.
                  </p>
                  <p>
                    We are a customer-centric custom web design agency that values communication and
                    transparency. Our custom web design experts take every step important to them
                    and thus keep you in the loop and update you on the progress of the project.
                    This helps us to get feedback at every stage of development; from the initial
                    consultation to the final delivery of your custom website. We understand the
                    importance of deadlines and work tirelessly to ensure that we deliver your
                    website within the agreed timeline and budget.
                  </p>
                </div>
              </section>

              {/* Customized services list */}
              <section className="bg-white border border-gray-200 rounded-xl p-6 md:p-8 shadow-sm">
                <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-wide">
                  Customized Website Development Services in Kenya
                </h2>

                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-3">
                  {customizedWebsiteDevelopmentServices.map((item) => (
                    <div key={item} className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-gray-500 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700">{item}</span>
                    </div>
                  ))}
                </div>
              </section>

              {/* Website development cards */}
              <section className="bg-white border border-gray-200 rounded-xl p-6 md:p-8 shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {webDevCards.map((card, index) => (
                    <motion.div
                      key={card.title}
                      initial={{ opacity: 0, y: 10 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.4, delay: index * 0.04 }}
                      className="rounded-2xl border border-gray-200 bg-white shadow-sm hover:shadow-lg transition-shadow duration-300 p-6"
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 rounded-xl border border-gray-200 bg-gray-50 p-3">
                          <card.icon className="h-7 w-7 text-gray-900" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-lg font-extrabold text-gray-900">{card.title}</h3>
                          <p className="mt-2 text-sm text-gray-600 leading-relaxed">
                            {card.description}
                          </p>
                          <div className="mt-5">
                            <Link
                              href="/contact"
                              className="inline-flex items-center gap-2 text-sm font-bold text-secondary-700 hover:text-secondary-800"
                            >
                              <span>GET STARTED</span>
                              <ArrowRight className="h-4 w-4" />
                            </Link>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </section>

              {/* Past Website Work */}
              <section className="bg-white border border-gray-200 rounded-xl p-6 md:p-8 shadow-sm">
                <div className="text-center">
                  <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-wide">
                    OUR PAST WEBSITE WORK
                  </h2>
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

            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

