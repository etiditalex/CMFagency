import type { Metadata } from "next";

const title = "Website Development & Design in Kenya";
const description =
  "Custom website design and development that looks great, loads fast, and converts. We build responsive, SEO-friendly websites and provide ongoing maintenance and support.";

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: "/services/website-development",
  },
  openGraph: {
    title,
    description,
    type: "website",
    url: "https://cmfagency.co.ke/services/website-development",
    images: [
      {
        // Route-level Open Graph image (generated, no remote fetch)
        url: "/services/website-development/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Website Development & Design by Changer Fusions",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/services/website-development/opengraph-image"],
  },
  keywords: [
    "website development Kenya",
    "web design Kenya",
    "responsive web design",
    "Next.js development Kenya",
    "business website Kenya",
    "ecommerce website Kenya",
    "SEO friendly website",
    "website maintenance Kenya",
    "Changer Fusions web development",
  ],
};

