import type { Metadata } from "next";

const title = "Digital Marketing Services in Mombasa, Kenya";
const description =
  "Data-driven digital marketing in Mombasa and across Kenya. SEO, PPC, social media marketing, email campaigns, and multi-channel strategy to grow awareness, leads, and revenue.";

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: "/services/digital-marketing",
  },
  openGraph: {
    title,
    description,
    type: "website",
    url: "https://cmfagency.co.ke/services/digital-marketing",
    images: [
      {
        url: "/services/digital-marketing/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Digital Marketing Services by Changer Fusions",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/services/digital-marketing/opengraph-image"],
  },
  keywords: [
    "digital marketing Mombasa",
    "digital marketing Kenya",
    "SEO services Kenya",
    "PPC services Kenya",
    "social media marketing Kenya",
    "email marketing Kenya",
    "marketing agency Mombasa",
    "Changer Fusions digital marketing",
  ],
};

