import { Metadata } from "next";
import { EVENTS_BANNER_OG } from "@/lib/og-images";

export const metadata: Metadata = {
  title: "Events Calendar",
  description:
    "The Changer Fusions events calendar lists Kenya Fashion and Creative Arts Awards host dates, including the 2028 calendar.",
  keywords: [
    "2028 Calendar",
    "events calendar Kenya",
    "Kenya Fashion and Creative Arts Awards",
    "Changer Fusions events",
    "Mombasa events",
  ],
  openGraph: {
    type: "website",
    title: "Events Calendar | Changer Fusions",
    description:
      "The Changer Fusions events calendar lists Kenya Fashion and Creative Arts Awards host dates.",
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
    title: "Events Calendar | Changer Fusions",
    description:
      "The Changer Fusions events calendar lists Kenya Fashion and Creative Arts Awards host dates.",
    images: [EVENTS_BANNER_OG.url],
  },
  alternates: {
    canonical: "https://cmfagency.co.ke/events",
  },
};
