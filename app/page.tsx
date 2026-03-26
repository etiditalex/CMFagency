import { Metadata } from "next";
import nextDynamic from "next/dynamic";
import Hero from "@/components/home/Hero";
import FeaturedEvents from "@/components/home/FeaturedEvents";
import CoreValues from "@/components/home/CoreValues";
import QuickLinks from "@/components/home/QuickLinks";
import WhatWeDoOrbit from "@/components/home/WhatWeDoOrbit";
import StatsSection from "@/components/home/StatsSection";
import { BRAND_LOGO_URL } from "@/lib/brand-logo";

/** Avoid stale static HTML on refresh (Vercel/CDN serving an old prerender of this page). */
export const dynamic = "force-dynamic";

const HomeGalleryCarousel = nextDynamic(() => import("@/components/home/HomeGalleryCarousel"), { ssr: true });
const PartnersCarousel = nextDynamic(() => import("@/components/home/PartnersCarousel"), { ssr: true });
const CTABanner = nextDynamic(() => import("@/components/home/CTABanner"), { ssr: true });

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
      <FeaturedEvents />
      <CoreValues />
      <HomeGalleryCarousel />
      <QuickLinks />
      <WhatWeDoOrbit />
      <StatsSection />
      <PartnersCarousel />
      <CTABanner />
    </>
  );
}






