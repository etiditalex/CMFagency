import type { Metadata } from "next";
import { BRAND_LOGO_URL } from "@/lib/brand-logo";

const title = "Download Company Profile";
const description =
  "Download the official Changer Fusions company profile PDF. Learn who we are, the marketing services we offer, and how we partner with brands across Kenya.";
const canonicalUrl = "https://cmfagency.co.ke/download";

export const metadata: Metadata = {
  title,
  description,
  keywords: [
    "Changer Fusions company profile",
    "download company profile",
    "marketing agency Kenya profile",
    "Changer Fusions PDF",
    "marketing agency Mombasa",
  ],
  alternates: {
    canonical: canonicalUrl,
  },
  openGraph: {
    title,
    description,
    type: "website",
    url: canonicalUrl,
    images: [
      {
        url: BRAND_LOGO_URL,
        width: 1200,
        height: 630,
        alt: "Download the Changer Fusions company profile",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: [BRAND_LOGO_URL],
  },
};
