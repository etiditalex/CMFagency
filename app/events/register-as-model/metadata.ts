import { Metadata } from "next";
import { EVENTS_BANNER_OG } from "@/lib/og-images";

export const metadata: Metadata = {
  title: "Register as a Model | KCM & Changer Fusions",
  description:
    "Register as a model or contestant with Changer Fusions and Kenya Coast Models (KCM). Submit your details and receive your voting campaign link by email.",
  keywords: [
    "register as a model",
    "model registration Kenya",
    "Kenya Coast Models registration",
    "KCM registration",
    "register as model Changer Fusions",
    "CMF model registration",
  ],
  openGraph: {
    type: "website",
    title: "Register as a Model | KCM & Changer Fusions",
    description: "Register as a model or contestant and receive your voting campaign link by email.",
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
    title: "Register as a Model | KCM & Changer Fusions",
    description: "Register as a model or contestant and receive your voting campaign link by email.",
    images: [EVENTS_BANNER_OG.url],
  },
  alternates: {
    canonical: "https://cmfagency.co.ke/events/register-as-model",
  },
};
