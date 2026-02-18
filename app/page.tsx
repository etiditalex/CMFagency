import { Metadata } from "next";
import dynamic from "next/dynamic";
import Hero from "@/components/home/Hero";
import FeaturedEvents from "@/components/home/FeaturedEvents";
import CoreValues from "@/components/home/CoreValues";
import QuickLinks from "@/components/home/QuickLinks";
import StatsSection from "@/components/home/StatsSection";

const HomeGalleryCarousel = dynamic(() => import("@/components/home/HomeGalleryCarousel"), { ssr: true });
const PartnersCarousel = dynamic(() => import("@/components/home/PartnersCarousel"), { ssr: true });
const ConferenceNews = dynamic(() => import("@/components/home/ConferenceNews"), { ssr: true });
const CTABanner = dynamic(() => import("@/components/home/CTABanner"), { ssr: true });

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
      <StatsSection />
      <PartnersCarousel />
      <ConferenceNews />
      <CTABanner />
    </>
  );
}






