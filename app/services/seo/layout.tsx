import type { Metadata } from "next";
import SeoServiceJsonLd from "@/components/services/SeoServiceJsonLd";

const canonicalUrl = "https://cmfagency.co.ke/services/seo";
const ogImage =
  "https://res.cloudinary.com/dyfnobo9r/image/upload/v1778316586/seo_wfek2p.jpg";

export const metadata: Metadata = {
  title: "SEO Services Kenya | Local & Technical SEO | Changer Fusions Mombasa",
  description:
    "Grow organic traffic with SEO services in Kenya and Mombasa: technical SEO, on-page optimization, local SEO, content SEO, and monthly packages from KSh 20,000. Pay online — Changer Fusions.",
  keywords: [
    "SEO Kenya",
    "SEO services Mombasa",
    "SEO company Kenya",
    "local SEO Kenya",
    "technical SEO Kenya",
    "on-page SEO",
    "Google Business Profile Kenya",
    "SEO packages Kenya",
    "monthly SEO retainer",
    "Changer Fusions SEO",
    "digital marketing agency SEO",
  ],
  alternates: {
    canonical: canonicalUrl,
  },
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
    type: "website",
    locale: "en_KE",
    url: canonicalUrl,
    siteName: "Changer Fusions",
    title: "SEO Services Kenya | Changer Fusions — Mombasa",
    description:
      "Professional SEO for Kenyan businesses: audits, keywords, technical fixes, local SEO, and monthly plans. Based in Mombasa; serving Kenya-wide.",
    images: [
      {
        url: ogImage,
        width: 1200,
        height: 630,
        alt: "Changer Fusions SEO services — Kenya",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "SEO Services Kenya | Changer Fusions",
    description:
      "Technical, local, and content SEO with clear monthly packages. Mombasa-based agency serving Kenya.",
    images: [ogImage],
  },
};

export default function SeoServiceLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SeoServiceJsonLd />
      {children}
    </>
  );
}
