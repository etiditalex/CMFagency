import { Metadata } from "next";
import Hero from "@/components/home/Hero";
import FeaturedEvents from "@/components/home/FeaturedEvents";
import CoreValues from "@/components/home/CoreValues";
import HomeGalleryCarousel from "@/components/home/HomeGalleryCarousel";
import QuickLinks from "@/components/home/QuickLinks";
import StatsSection from "@/components/home/StatsSection";
import PartnersCarousel from "@/components/home/PartnersCarousel";
import ConferenceNews from "@/components/home/ConferenceNews";
import CTABanner from "@/components/home/CTABanner";

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






