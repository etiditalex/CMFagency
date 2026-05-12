import { Metadata } from "next";
import AdSenseBlock from "@/components/AdSenseBlock";
import Hero from "@/components/home/Hero";
import HeroSupportSection from "@/components/home/HeroSupportSection";
import FeaturedEvents from "@/components/home/FeaturedEvents";
import CoreValues from "@/components/home/CoreValues";
import QuickLinks from "@/components/home/QuickLinks";
import WhatWeDoOrbit from "@/components/home/WhatWeDoOrbit";
import StatsSection from "@/components/home/StatsSection";
import { HomeDeferredGallery, HomeDeferredPartnersCTA } from "@/components/home/HomeBelowFoldDynamic";
import { BRAND_LOGO_URL } from "@/lib/brand-logo";

/** Keep homepage fast with ISR instead of per-request rendering. */
export const revalidate = 300;

export const metadata: Metadata = {
  title: "Changer Fusions - Marketing Agency in Ambalal, Mombasa | Digital Marketing, Web Development",
  description: "Changer Fusions is Kenya's leading marketing agency in Ambalal, Mombasa. Digital marketing, website development, branding, event management, market research. Ambalal Building, Nkruma Road. Market to thrive, Market to exist.",
  keywords: [
    "Changer Fusions",
    "marketing agency Ambalal",
    "marketing agency Kenya",
    "best marketing agency Kenya",
    "digital marketing Kenya",
    "Mombasa marketing agency",
    "website development Kenya",
    "branding services Kenya",
    "event management Kenya",
    "SEO services Kenya",
    "social media marketing Kenya",
    "top marketing company Kenya",
    "marketing consultancy Kenya",
    "web design Kenya",
    "brand identity Kenya",
    "event planning Kenya",
    "market research Kenya",
    "content creation Kenya",
    "online marketing Kenya",
    "marketing solutions Kenya",
  ],
  openGraph: {
    title: "Changer Fusions - Leading Marketing Agency in Kenya",
    description: "Premier marketing agency in Kenya offering digital marketing, website development, branding, and event management services.",
    url: "https://cmfagency.co.ke",
    siteName: "Changer Fusions",
    images: [
      {
        url: BRAND_LOGO_URL,
        width: 1200,
        height: 630,
        alt: "Changer Fusions Marketing Agency",
      },
    ],
    locale: "en_KE",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Changer Fusions - Leading Marketing Agency in Kenya",
    description: "Premier marketing agency in Kenya offering digital marketing, website development, branding, and event management services.",
    images: [BRAND_LOGO_URL],
  },
  alternates: {
    canonical: "https://cmfagency.co.ke",
  },
};

export default function Home() {
  return (
    <>
      <Hero />
      <section className="border-y border-gray-200 bg-gray-50/80" aria-label="Advertisement">
        <div className="container-custom py-6 md:py-8">
          <p className="text-xs text-gray-500 mb-3 text-center">Advertisement</p>
          <AdSenseBlock />
        </div>
      </section>
      <HeroSupportSection />
      <FeaturedEvents />
      <CoreValues />
      <HomeDeferredGallery />
      <QuickLinks />
      <WhatWeDoOrbit />
      <StatsSection />
      <HomeDeferredPartnersCTA />
    </>
  );
}






