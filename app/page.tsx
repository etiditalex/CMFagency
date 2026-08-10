import { Metadata } from "next";
import Hero from "@/components/home/Hero";
import HeroSupportSection from "@/components/home/HeroSupportSection";
import FeaturedEvents from "@/components/home/FeaturedEvents";
import CoreValues from "@/components/home/CoreValues";
import QuickLinks from "@/components/home/QuickLinks";
import WhatWeDoOrbit from "@/components/home/WhatWeDoOrbit";
import StatsSection from "@/components/home/StatsSection";
import { HomeDeferredGallery, HomeDeferredPartnersCTA } from "@/components/home/HomeBelowFoldDynamic";
import HomeJsonLd from "@/components/home/HomeJsonLd";

/** Keep homepage fast with ISR instead of per-request rendering. */
export const revalidate = 300;

const OG_IMAGE =
  "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765955875/WhatsApp_Image_2025-12-17_at_9.33.02_AM_cjrrxx.jpg";

export const metadata: Metadata = {
  title: {
    absolute:
      "Changer Fusions | Marketing Agency in Ambalal, Mombasa — Digital Marketing & Events",
  },
  description:
    "Changer Fusions is a marketing agency in Ambalal, Mombasa. Digital marketing, website development, branding, events, Fusion Xpress ticketing, and career development across Kenya. Market to thrive, Market to exist.",
  keywords: [
    "Changer Fusions",
    "marketing agency Ambalal",
    "marketing agency Mombasa",
    "marketing agency Kenya",
    "digital marketing Kenya",
    "website development Kenya",
    "branding services Kenya",
    "event management Kenya",
    "SEO services Kenya",
    "social media marketing Kenya",
    "Fusion Xpress",
    "visitor management Kenya",
    "career development Kenya",
    "CMF Agency",
  ],
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    title: "Changer Fusions | Marketing Agency in Ambalal, Mombasa",
    description:
      "Digital marketing, web development, branding, events, and career pathways from Changer Fusions in Mombasa, Kenya.",
    url: "https://cmfagency.co.ke",
    siteName: "Changer Fusions",
    images: [
      {
        url: OG_IMAGE,
        width: 1200,
        height: 630,
        alt: "Changer Fusions marketing agency — Ambalal, Mombasa, Kenya",
      },
    ],
    locale: "en_KE",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Changer Fusions | Marketing Agency in Ambalal, Mombasa",
    description:
      "Digital marketing, web development, branding, events, and career pathways from Changer Fusions in Mombasa, Kenya.",
    images: [OG_IMAGE],
  },
  alternates: {
    canonical: "https://cmfagency.co.ke",
  },
  category: "marketing",
};

export default function Home() {
  return (
    <>
      <HomeJsonLd />
      <Hero />
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
