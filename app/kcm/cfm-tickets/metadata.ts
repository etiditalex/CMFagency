import type { Metadata } from "next";

const title = "CFM Tickets | Coast Fashion & Modelling Awards";
const description =
  "Buy CFM Tickets for Coast Fashion & Modelling Awards packages: KES 500, KES 1,500, and KES 3,500. View ticket options and choose your preferred package.";
const posterImage = "https://res.cloudinary.com/dyfnobo9r/image/upload/v1768551251/CFMA_qxfe0m.jpg";
const canonicalUrl = "https://cmfagency.co.ke/kcm/cfm-tickets";

export const metadata: Metadata = {
  title,
  description,
  keywords: [
    "CFM Tickets",
    "CFM tickets Kenya",
    "CMFA tickets",
    "Coast Fashion and Modelling Awards tickets",
    "CFMA 2026 tickets",
    "Mombasa event tickets",
  ],
  alternates: {
    canonical: canonicalUrl,
  },
  openGraph: {
    type: "website",
    title,
    description,
    url: canonicalUrl,
    siteName: "Changer Fusions",
    locale: "en_KE",
    images: [
      {
        url: posterImage,
        width: 1200,
        height: 630,
        alt: "CFM Tickets - Coast Fashion and Modelling Awards",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: [posterImage],
  },
};
