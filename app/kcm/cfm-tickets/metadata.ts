import type { Metadata } from "next";
import { SITE_URL } from "@/lib/site-url";

const canonicalUrl = `${SITE_URL}/kcm/cfm-tickets`;

/** Absolute title — primary keywords first for SERP relevance (≤ ~60 chars ideal). */
const title = "CFM Awards Tickets | Coast Fashion Awards 2026";

/**
 * Meta description: target queries + clear CTA with ticket URL for SERP snippet.
 * Keep under ~160 chars for classic snippets; Google may show longer.
 */
const description =
  "Buy official CFM Awards & Coast Fashion Awards tickets online. CFM tickets for Coast Fashion & Modelling Awards 2026 — Regular, VIP, VVIP. Pay with M-Pesa or card. Tickets: https://cmfagency.co.ke/kcm/cfm-tickets";

const posterImage = "https://res.cloudinary.com/dyfnobo9r/image/upload/v1768551251/CFMA_qxfe0m.jpg";

export const metadata: Metadata = {
  title: {
    absolute: title,
  },
  description,
  keywords: [
    "coast fashion awards",
    "cfm awards",
    "cfm tickets coast fashion",
    "CFM tickets",
    "CFM Awards tickets",
    "Coast Fashion Awards tickets",
    "Coast Fashion and Modelling Awards",
    "Coast Fashion & Modelling Awards 2026",
    "CFMA tickets",
    "CFMA 2026 tickets",
    "buy CFM tickets Kenya",
    "coast fashion tickets",
    "Mombasa fashion awards tickets",
    "CFM tickets Mombasa",
    "CFM tickets online",
    "Changer Fusions tickets",
    "Kenya fashion awards tickets",
    "VVIP VIP Regular CFM tickets",
    "M-Pesa event tickets Kenya",
  ],
  authors: [{ name: "Changer Fusions", url: SITE_URL }],
  category: "events",
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
    title: `${title} | Changer Fusions`,
    description,
    url: canonicalUrl,
    siteName: "Changer Fusions",
    locale: "en_KE",
    images: [
      {
        url: posterImage,
        width: 1200,
        height: 630,
        alt: "Buy CFM Awards tickets — Coast Fashion Awards 2026 Kenya",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${title} | Changer Fusions`,
    description,
    images: [posterImage],
  },
};
