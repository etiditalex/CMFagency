import { Metadata } from "next";
import { BRAND_LOGO_URL } from "@/lib/brand-logo";

export const metadata: Metadata = {
  title: "About Changer Fusions - Marketing Agency Kenya | Our Story & Mission",
  description: "Learn about Changer Fusions, a forward-thinking marketing agency in Kenya. Discover our vision, mission, services, and commitment to helping businesses thrive through innovative marketing strategies.",
  keywords: [
    "about Changer Fusions",
    "marketing agency Kenya about",
    "Changer Fusions company",
    "marketing agency Mombasa",
    "Kenya marketing services",
  ],
  openGraph: {
    title: "About Changer Fusions - Marketing Agency Kenya",
    description: "Learn about Changer Fusions, a forward-thinking marketing agency in Kenya helping businesses grow.",
    url: "https://cmfagency.co.ke/about",
    images: [
      {
        url: BRAND_LOGO_URL,
        width: 1200,
        height: 630,
        alt: "About Changer Fusions - Marketing Agency Kenya",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "About Changer Fusions - Marketing Agency Kenya",
    description: "Learn about Changer Fusions, a forward-thinking marketing agency in Kenya helping businesses grow.",
    images: [BRAND_LOGO_URL],
  },
  alternates: {
    canonical: "https://cmfagency.co.ke/about",
  },
};

