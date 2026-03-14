import { Metadata } from "next";
import { EVENTS_BANNER_OG } from "@/lib/og-images";

export const metadata: Metadata = {
  title: "Upcoming Events | Coast Fashion & Modelling Awards | CMF Agency",
  description: "Coast Fashion and Modelling Awards 2026 (CMFA) - our premier upcoming event in Mombasa. View details, get tickets, and be part of the excitement.",
  keywords: [
    "Buy tickets online",
    "CMF awards 2026",
    "CFMA 2026",
    "events Mombasa 2026",
    "Mombasa events 2026",
    "fashion event Mombasa",
    "Coast Fashion and Modelling Awards 2026",
    "buy event tickets Kenya",
    "fashion awards Kenya",
    "modelling awards Kenya",
    "Mombasa fashion event",
    "sustainable fashion Kenya",
    "eco-tourism Kenya",
    "youth talent Kenya",
    "event tickets Mombasa",
    "event sponsorship Kenya",
  ],
  openGraph: {
    type: "website",
    title: "CMF Awards 2026 Mombasa - Buy Tickets Online | CFMA 2026",
    description: "Buy tickets online for Coast Fashion & Modelling Awards 2026 in Mombasa, Kenya. 15th August 2026. Early bird from KES 500. Celebrate heritage, empower youth talent.",
    url: "https://cmfagency.co.ke/events/upcoming",
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
    title: "CMF Awards 2026 Mombasa - Buy Tickets Online",
    description: "Buy tickets online for Coast Fashion & Modelling Awards 2026 in Mombasa. 15th August 2026. Early bird from KES 500.",
    images: [EVENTS_BANNER_OG.url],
  },
  alternates: {
    canonical: "https://cmfagency.co.ke/events/upcoming",
  },
};





