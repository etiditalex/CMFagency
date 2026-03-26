import { Metadata } from "next";
import { BRAND_LOGO_URL } from "@/lib/brand-logo";

export const metadata: Metadata = {
  title: "Marketing Services Kenya - Digital Marketing, Web Development, Branding | Changer Fusions",
  description: "Comprehensive marketing services in Kenya including digital marketing, website development, branding, market research, event management, and content creation. Expert marketing solutions for your business growth.",
  keywords: [
    "marketing services Kenya",
    "digital marketing services",
    "website development Kenya",
    "branding services Kenya",
    "event management services",
    "market research Kenya",
    "content creation services",
  ],
  openGraph: {
    title: "Marketing Services Kenya - Changer Fusions",
    description: "Comprehensive marketing services in Kenya for business growth and success.",
    url: "https://cmfagency.co.ke/services",
    images: [
      {
        url: BRAND_LOGO_URL,
        width: 1200,
        height: 630,
        alt: "Marketing Services Kenya - Changer Fusions",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Marketing Services Kenya - Changer Fusions",
    description: "Comprehensive marketing services in Kenya for business growth and success.",
    images: [BRAND_LOGO_URL],
  },
  alternates: {
    canonical: "https://cmfagency.co.ke/services",
  },
};

