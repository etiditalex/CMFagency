"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, CheckCircle, ChevronRight, type LucideIcon } from "lucide-react";

const SERVICES_NAV = [
  { label: "ALL SERVICES", href: "/services" },
  { label: "DIGITAL MARKETING", href: "/services/digital-marketing" },
  { label: "SEO", href: "/services/seo" },
  { label: "SOCIAL MEDIA MARKETING", href: "/services/social-media-marketing" },
  { label: "WEBSITE DEVELOPMENT", href: "/services/website-development" },
  { label: "BRANDING", href: "/services/branding" },
  { label: "MARKET RESEARCH", href: "/services/market-research" },
  { label: "EVENTS MARKETING", href: "/services/events-marketing" },
  { label: "CONTENT CREATION", href: "/services/content-creation" },
];

type ServiceDetailTemplateProps = {
  activeHref: string;
  title?: string;
  heroLabel?: string;
  description?: string;
  introContent?: ReactNode;
  /** Rendered after the features grid (e.g. full-bleed mid-page CTA). */
  afterFeaturesContent?: ReactNode;
  featuresTitle?: string;
  features?: string[];
  benefitsTitle?: string;
  benefits?: string[];
  ctaTitle?: string;
  ctaDescription?: string;
  icon: LucideIcon;
  backgroundImageUrl?: string;
  layout?: "withSidebar" | "fullWidth";
  heroVariant?: "default" | "digitalMarketing" | "simple" | "fullWidthImage";
};

export default function ServiceDetailTemplate({
  activeHref,
  title,
  heroLabel,
  description,
  introContent,
  afterFeaturesContent,
  featuresTitle,
  features,
  benefitsTitle,
  benefits,
  ctaTitle,
  ctaDescription,
  icon: Icon,
  backgroundImageUrl,
  layout = "withSidebar",
  heroVariant = "default",
}: ServiceDetailTemplateProps) {
  const titleText = title ?? "";
  const heroLabelText = heroLabel ?? "";
  const descriptionText = description ?? "";
  const featuresArr = features ?? [];
  const benefitsArr = benefits ?? [];

  return (
    <div className="pt-28 md:pt-32 min-h-screen bg-gray-50 overflow-x-hidden">
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
            {titleText ? <span className="text-gray-900 font-semibold">{titleText.toUpperCase()}</span> : null}
          </div>
        </div>
      </div>

      <div className="w-full px-4 sm:px-6 lg:px-10 xl:px-14 2xl:px-16 py-10">
        <div className={layout === "withSidebar" ? "grid grid-cols-1 lg:grid-cols-4 gap-10" : "grid grid-cols-1"}>
          {layout === "withSidebar" ? (
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
          ) : null}

          <main className={layout === "withSidebar" ? "min-w-0 lg:col-span-3" : "min-w-0"}>
            <div
              className={
                heroVariant === "digitalMarketing" || heroVariant === "simple" || heroVariant === "fullWidthImage"
                  ? "relative ml-[calc(50%-50vw)] w-screen max-w-[100vw] bg-white"
                  : "relative overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
              }
            >
              <div
                className={[
                  "relative",
                  heroVariant === "digitalMarketing"
                    ? "py-10 md:py-14"
                    : heroVariant === "simple"
                      ? "py-10 md:py-14"
                      : heroVariant === "fullWidthImage"
                        ? "aspect-[16/9] min-h-[220px] sm:aspect-[16/7] sm:min-h-[280px] md:aspect-[16/6] md:min-h-[380px] lg:min-h-[440px]"
                        : "bg-gradient-to-br from-primary-700 via-secondary-600 to-primary-800 aspect-[16/7] min-h-[260px]",
                ].join(" ")}
              >
                {heroVariant === "digitalMarketing" || heroVariant === "simple" ? null : backgroundImageUrl ? (
                  <>
                    {/* Background image uploaded by admin (stored as data URL). */}
                    <img
                      src={backgroundImageUrl}
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover object-center"
                      loading="eager"
                    />
                    <div className={heroVariant === "fullWidthImage" ? "absolute inset-0 bg-black/60" : "absolute inset-0 bg-black/40"} />
                  </>
                ) : (
                  <div className="absolute inset-0 bg-black/15" />
                )}

                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.55 }}
                  className={
                    heroVariant === "digitalMarketing"
                      ? "w-full max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-10 xl:px-14 2xl:px-16"
                      : heroVariant === "simple"
                        ? "w-full px-4 sm:px-6 lg:px-10 xl:px-14 2xl:px-16"
                        : heroVariant === "fullWidthImage"
                          ? "absolute inset-0 flex items-center justify-center px-4 sm:px-6 lg:px-10 xl:px-14 2xl:px-16"
                          : "absolute inset-0 flex items-end p-6 md:p-8"
                  }
                >
                  {heroVariant === "digitalMarketing" ? (
                    <div className="w-full">
                      <div className="text-center">
                        {titleText ? (
                          <h1 className="text-3xl md:text-5xl font-extrabold text-gray-900 tracking-tight">
                            {titleText}
                          </h1>
                        ) : null}
                        {descriptionText ? (
                          <p className="mt-3 max-w-4xl mx-auto text-gray-600 leading-relaxed text-base md:text-lg">
                            {descriptionText}
                          </p>
                        ) : null}
                      </div>

                      <div className="mt-8 md:mt-10">
                        <div className="relative mx-auto max-w-[980px]">
                          {/* Connection lines */}
                          <svg
                            className="hidden md:block absolute inset-0 w-full h-full"
                            viewBox="0 0 980 420"
                            preserveAspectRatio="none"
                            aria-hidden="true"
                          >
                            <line x1="250" y1="110" x2="410" y2="170" stroke="#0f172a" strokeWidth="3" />
                            <line x1="730" y1="110" x2="570" y2="170" stroke="#0f172a" strokeWidth="3" />
                            <line x1="250" y1="320" x2="410" y2="250" stroke="#0f172a" strokeWidth="3" />
                            <line x1="730" y1="320" x2="570" y2="250" stroke="#0f172a" strokeWidth="3" />
                          </svg>

                          <div className="relative grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                            {/* Left boxes */}
                            <div className="md:col-span-4 space-y-6">
                              <div className="rounded-xl bg-slate-900 px-7 py-6 text-secondary-500 font-extrabold text-2xl md:text-3xl leading-tight shadow-sm">
                                Media
                                <br />
                                relations
                              </div>
                              <div className="rounded-xl bg-slate-900 px-7 py-6 text-secondary-500 font-extrabold text-2xl md:text-3xl leading-tight shadow-sm">
                                Website
                                <br />
                                blog
                              </div>
                            </div>

                            {/* Center venn */}
                            <div className="md:col-span-4 flex justify-center">
                              <div className="relative h-[240px] w-[240px]">
                                <div className="absolute left-1/2 top-[0px] -translate-x-[120px] h-[160px] w-[160px] rounded-full border-4 border-secondary-500/70 bg-white" />
                                <div className="absolute left-1/2 top-[0px] -translate-x-[40px] h-[160px] w-[160px] rounded-full border-4 border-secondary-500/70 bg-white" />
                                <div className="absolute left-1/2 top-[80px] -translate-x-[120px] h-[160px] w-[160px] rounded-full border-4 border-secondary-500/70 bg-white" />
                                <div className="absolute left-1/2 top-[80px] -translate-x-[40px] h-[160px] w-[160px] rounded-full border-4 border-secondary-500/70 bg-white" />

                                <div className="absolute left-1/2 top-[56px] -translate-x-[92px] text-xl font-semibold text-gray-900">
                                  Earned
                                </div>
                                <div className="absolute left-1/2 top-[56px] translate-x-[12px] text-xl font-semibold text-gray-900">
                                  Paid
                                </div>
                                <div className="absolute left-1/2 top-[136px] -translate-x-[92px] text-xl font-semibold text-gray-900">
                                  Owned
                                </div>
                                <div className="absolute left-1/2 top-[136px] translate-x-[12px] text-xl font-semibold text-gray-900">
                                  Shared
                                </div>
                              </div>
                            </div>

                            {/* Right boxes */}
                            <div className="md:col-span-4 space-y-6 md:text-right">
                              <div className="rounded-xl bg-slate-900 px-7 py-6 text-secondary-500 font-extrabold text-2xl md:text-3xl leading-tight shadow-sm">
                                Advertising
                              </div>
                              <div className="rounded-xl bg-slate-900 px-7 py-6 text-secondary-500 font-extrabold text-2xl md:text-3xl leading-tight shadow-sm">
                                Social
                                <br />
                                media
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : heroVariant === "simple" ? (
                    <div className="w-full">
                      <div className="w-full text-left">
                        {heroLabelText ? (
                          <div className="text-left text-xs font-extrabold tracking-widest uppercase text-emerald-600">
                            {heroLabelText}
                          </div>
                        ) : null}
                        {titleText ? (
                          <h1 className="text-left mt-3 text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight">
                            {titleText}
                          </h1>
                        ) : null}
                        <div className="mt-5 h-1 w-12 rounded-full bg-emerald-500" />
                        {descriptionText ? (
                          <p className="text-left mt-8 text-gray-600 leading-relaxed max-w-4xl">{descriptionText}</p>
                        ) : null}
                      </div>
                    </div>
                  ) : heroVariant === "fullWidthImage" ? (
                    <div className="w-full max-w-5xl px-1 text-center sm:px-2">
                      {heroLabelText ? (
                        <div className="inline-flex items-center rounded-full border border-white/25 bg-white/10 px-4 py-1.5 text-xs font-extrabold tracking-widest text-white uppercase backdrop-blur-sm">
                          {heroLabelText}
                        </div>
                      ) : null}
                      {titleText ? (
                        <h1 className="mt-4 text-balance text-3xl font-extrabold tracking-tight text-white sm:text-4xl md:text-5xl lg:text-6xl">
                          {titleText}
                        </h1>
                      ) : null}
                      {descriptionText ? (
                        <p className="mt-4 text-base text-white/90 leading-relaxed md:text-lg">
                          {descriptionText}
                        </p>
                      ) : null}
                    </div>
                  ) : (
                      (heroLabelText || titleText || descriptionText) && (
                        <>
                          {heroLabelText ? (
                            <div className="flex items-center gap-3 mb-3">
                              <div className="w-11 h-11 bg-white/15 backdrop-blur-sm rounded-full flex items-center justify-center">
                                <Icon className="w-6 h-6 text-white" />
                              </div>
                              <span className="text-white/90 text-sm font-semibold tracking-wide">{heroLabelText}</span>
                            </div>
                          ) : null}
                          {titleText ? <h1 className="text-3xl md:text-4xl font-extrabold text-white">{titleText}</h1> : null}
                          {descriptionText ? <p className="mt-3 text-white/90 leading-relaxed">{descriptionText}</p> : null}
                        </>
                      )
                    )}
                </motion.div>
              </div>
            </div>

            <div className="mt-10 space-y-10">
              {introContent ? introContent : null}
              {featuresArr.length > 0 ? (
                <section className="bg-white border border-gray-200 rounded-xl p-6 md:p-8 shadow-sm">
                  {featuresTitle ? (
                    <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-wide">{featuresTitle}</h2>
                  ) : null}
                  <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {featuresArr.map((feature, index) => (
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
              ) : null}

              {afterFeaturesContent ? afterFeaturesContent : null}

              {benefitsArr.length > 0 ? (
                <section className="bg-white border border-gray-200 rounded-xl p-6 md:p-8 shadow-sm">
                  {benefitsTitle ? (
                    <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-wide">{benefitsTitle}</h2>
                  ) : null}
                  <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {benefitsArr.map((benefit, index) => (
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
              ) : null}

              {ctaTitle || ctaDescription ? (
                <section className="p-8 bg-gradient-to-br from-primary-600 to-secondary-600 rounded-2xl text-white">
                  {ctaTitle ? <h2 className="text-2xl md:text-3xl font-extrabold mb-3">{ctaTitle}</h2> : null}
                  {ctaDescription ? <p className="text-white/90 leading-relaxed max-w-2xl">{ctaDescription}</p> : null}
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
              ) : null}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
