import { Metadata } from "next";
import { EVENTS_BANNER_OG } from "@/lib/og-images";

export const metadata: Metadata = {
  title: "Register as a Model | Changer Fusions Events",
  description:
    "Register as a contestant in our voting categories. Add your name, email, and photo to compete. We'll send your voting campaign link to your email.",
  openGraph: {
    type: "website",
    title: "Register as a Model | Changer Fusions Events",
    description: "Register as a contestant and get your voting campaign link by email.",
    url: "https://cmfagency.co.ke/events/register-as-model",
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
    title: "Register as a Model | Changer Fusions Events",
    description: "Register as a contestant and get your voting campaign link by email.",
    images: [EVENTS_BANNER_OG.url],
  },
  alternates: {
    canonical: "https://cmfagency.co.ke/events/register-as-model",
  },
};
