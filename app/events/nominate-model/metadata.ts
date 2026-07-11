import { Metadata } from "next";

const PAGE_URL = "https://cmfagency.co.ke/events/nominate-model";
const OG_IMAGE =
  "https://res.cloudinary.com/dyfnobo9r/image/upload/v1776166126/models2_zb5yfj.jpg";

export const metadata: Metadata = {
  title:
    "Nominate a Model Kenya | Top 10 Male & Female Models CFMA 2026 | CMF Agency",
  description:
    "Nominate a model for the Coast Fashion & Modelling Awards 2026 in Mombasa. Submit Top 10 Male or Top 10 Female Model nominations online. CFMA 2026 — Saturday 15 August at City Blue Creekside Hotel.",
  keywords: [
    "nominate a model Kenya",
    "nominate model Mombasa",
    "nominate model CFMA 2026",
    "Coast Fashion Modelling Awards nominate",
    "Top 10 Male Models Kenya",
    "Top 10 Female Models Kenya",
    "nominate fashion model Coast Kenya",
    "CFMA 2026 nominations",
    "CMF Agency nominate model",
    "Changer Fusions awards nomination",
    "model awards Mombasa 2026",
  ],
  authors: [{ name: "Changer Fusions", url: "https://cmfagency.co.ke" }],
  creator: "Changer Fusions",
  publisher: "CMF Agency",
  category: "Events",
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
    title: "Nominate a Model for CFMA 2026 | Top 10 Male & Female | Mombasa",
    description:
      "Nominate Top 10 Male and Top 10 Female Models for the Coast Fashion & Modelling Awards 2026 in Mombasa. Free online nomination — recognized on event day, 15 August 2026.",
    url: PAGE_URL,
    siteName: "Changer Fusions | CMF Agency",
    images: [
      {
        url: OG_IMAGE,
        width: 1200,
        height: 630,
        alt: "Nominate a model for Coast Fashion & Modelling Awards 2026 runway in Mombasa",
        type: "image/jpeg",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Nominate a Model for CFMA 2026 | Mombasa",
    description:
      "Nominate Top 10 Male & Female Models for the Coast Fashion & Modelling Awards 2026. Event: 15 August, City Blue Creekside Hotel, Mombasa.",
    images: [OG_IMAGE],
  },
  alternates: {
    canonical: PAGE_URL,
    languages: {
      "en-KE": PAGE_URL,
      en: PAGE_URL,
    },
  },
};
