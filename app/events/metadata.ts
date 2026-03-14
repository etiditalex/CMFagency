import { Metadata } from "next";
import { EVENTS_BANNER_OG } from "@/lib/og-images";

export const metadata: Metadata = {
  title: "Events - Upcoming & Past Events | Changer Fusions",
  description: "Discover exciting upcoming events and relive memorable past events organized by Changer Fusions. From corporate events to cultural celebrations, explore our event portfolio.",
  keywords: [
    "events Kenya",
    "event management",
    "corporate events",
    "cultural events",
    "event planning Kenya",
    "Mombasa events",
  ],
  openGraph: {
    type: "website",
    title: "Events - Upcoming & Past Events | Changer Fusions",
    description: "Discover exciting upcoming events and relive memorable past events organized by Changer Fusions.",
    url: "https://cmfagency.co.ke/events",
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
    title: "Events - Upcoming & Past Events | Changer Fusions",
    description: "Discover exciting upcoming events and relive memorable past events organized by Changer Fusions.",
    images: [EVENTS_BANNER_OG.url],
  },
  alternates: {
    canonical: "https://cmfagency.co.ke/events",
  },
};





