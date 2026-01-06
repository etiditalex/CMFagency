import { Metadata } from "next";
import Hero from "@/components/home/Hero";
import FeaturedEvents from "@/components/home/FeaturedEvents";
import CoreValues from "@/components/home/CoreValues";
import QuickLinks from "@/components/home/QuickLinks";
import StatsSection from "@/components/home/StatsSection";
import PartnersCarousel from "@/components/home/PartnersCarousel";
import CTABanner from "@/components/home/CTABanner";

export const metadata: Metadata = {
  title: "Changer Fusions - Leading Marketing Agency in Kenya | Digital Marketing Services",
  description: "Changer Fusions is Kenya's premier marketing agency offering digital marketing, website development, branding, event management, and market research services. Market to thrive, Market to exist. Based in Mombasa, serving clients across Kenya.",
  keywords: [
    "marketing agency Kenya",
    "digital marketing Kenya",
    "Mombasa marketing agency",
    "website development Kenya",
    "branding services Kenya",
    "event management Kenya",
    "SEO services Kenya",
    "social media marketing Kenya",
  ],
  openGraph: {
    title: "Changer Fusions - Leading Marketing Agency in Kenya",
    description: "Premier marketing agency in Kenya offering digital marketing, website development, branding, and event management services.",
    url: "https://changerfusions.com",
    siteName: "Changer Fusions",
    images: [
      {
        url: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1766134130/changer_fusions_dyb52h.jpg",
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
    images: ["https://res.cloudinary.com/dyfnobo9r/image/upload/v1766134130/changer_fusions_dyb52h.jpg"],
  },
  alternates: {
    canonical: "https://changerfusions.com",
  },
};

export default function Home() {
  return (
    <>
      <Hero />
      <FeaturedEvents />
      <CoreValues />
      <QuickLinks />
      <StatsSection />
      <PartnersCarousel />
      <CTABanner />
    </>
  );
}






