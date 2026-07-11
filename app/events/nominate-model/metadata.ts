import { Metadata } from "next";
import { EVENTS_BANNER_OG } from "@/lib/og-images";

export const metadata: Metadata = {
  title: "Nominate Model | Coast Fashion & Modelling Awards 2026 | CMF Agency",
  description:
    "Call to nominate Top 10 Male and Top 10 Female Models for the Coast Fashion & Modelling Awards 2026. Crowning Change — recognize the best modeling talent on the Coast.",
  keywords: [
    "nominate model",
    "nominate models Kenya",
    "Coast Fashion Modelling Awards",
    "CFMA 2026",
    "Top 10 Male Models",
    "Top 10 Female Models",
    "CMF Agency",
  ],
  openGraph: {
    type: "website",
    title: "Nominate Model | CFMA 2026 | CMF Agency",
    description:
      "Nominate Top 10 Male and Top 10 Female Models for the Coast Fashion & Modelling Awards 2026. Crowning Change.",
    url: "https://cmfagency.co.ke/events/nominate-model",
    siteName: "Changer Fusions",
    images: [
      {
        url: EVENTS_BANNER_OG.url,
        width: EVENTS_BANNER_OG.width,
        height: EVENTS_BANNER_OG.height,
        alt: EVENTS_BANNER_OG.alt,
        type: EVENTS_BANNER_OG.type,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Nominate Model | CFMA 2026 | CMF Agency",
    description:
      "Nominate Top 10 Male and Top 10 Female Models for the Coast Fashion & Modelling Awards 2026.",
    images: [EVENTS_BANNER_OG.url],
  },
  alternates: {
    canonical: "https://cmfagency.co.ke/events/nominate-model",
  },
};
