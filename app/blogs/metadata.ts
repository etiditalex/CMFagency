import { Metadata } from "next";
import { SITE_URL } from "@/lib/site-url";

const canonicalBlogs = `${SITE_URL}/blogs`;
const ogImage =
  "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765955876/WhatsApp_Image_2025-12-17_at_9.31.49_AM_m3hebl.jpg";

const title = "Blogs & News | Marketing Insights Kenya";
const description =
  "Stay updated with the latest insights, trends, and news from marketing, events, and business growth in Kenya. Expert articles from Changer Fusions.";

/** Head-only ranking tags. Not rendered in the page body. */
export const metadata: Metadata = {
  title,
  description,
  keywords: [
    "marketing blog Kenya",
    "digital marketing insights",
    "marketing news Kenya",
    "business growth tips",
    "marketing trends",
    "event planning blog",
    "Changer Fusions blog",
  ],
  authors: [{ name: "Changer Fusions", url: SITE_URL }],
  creator: "Changer Fusions",
  publisher: "Changer Fusions",
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
    title,
    description,
    url: canonicalBlogs,
    type: "website",
    locale: "en_KE",
    siteName: "Changer Fusions",
    images: [
      {
        url: ogImage,
        width: 1200,
        height: 630,
        alt: "Blogs & News - Changer Fusions",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: [ogImage],
  },
  alternates: {
    canonical: canonicalBlogs,
    types: {
      "application/rss+xml": `${SITE_URL}/blogs/rss.xml`,
    },
  },
};
