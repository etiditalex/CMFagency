import { Metadata } from "next";
import Hero from "@/components/home/Hero";
import FeaturedEvents from "@/components/home/FeaturedEvents";
import CoreValues from "@/components/home/CoreValues";
import QuickLinks from "@/components/home/QuickLinks";
import StatsSection from "@/components/home/StatsSection";
import PartnersCarousel from "@/components/home/PartnersCarousel";
import CTABanner from "@/components/home/CTABanner";

export const metadata: Metadata = {
  title: "Changer Fusions - Leading Marketing Agency in Kenya | Digital Marketing, Web Development, Branding",
  description: "Changer Fusions is Kenya's #1 marketing agency offering comprehensive digital marketing, website development, branding, event management, and market research services. Based in Mombasa, serving businesses across Kenya. Market to thrive, Market to exist. Get expert marketing solutions that drive growth and results.",
  keywords: [
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






