import type { Metadata } from "next";
import { SITE_URL } from "@/lib/site-url";

const canonicalUrl = `${SITE_URL}/kcm/cfm-tickets`;

/** Absolute title avoids duplicate branding from root template and fits typical SERP width. */
const title =
  "Buy CFM Tickets Kenya | Coast Fashion & Modelling Awards (CFMA) 2026";

const description =
  "Official CFM / CFMA tickets for the Coast Fashion & Modelling Awards in Kenya. Choose Regular (KES 500), VIP (KES 1,500) or VVIP (KES 3,500). Pay online with M-Pesa STK or card (Paystack), or use Lipa Pole Pole installments. Secure checkout from Changer Fusions — serving Mombasa, Kilifi, Kwale, Voi and Nairobi.";

const posterImage = "https://res.cloudinary.com/dyfnobo9r/image/upload/v1768551251/CFMA_qxfe0m.jpg";

export const metadata: Metadata = {
  title: {
    absolute: title,
  },
  description,
  keywords: [
    "CFM tickets",
    "CFMA tickets",
    "CFM Awards tickets",
    "Coast Fashion and Modelling Awards tickets",
    "Coast fashion tickets",
    "Coast Fashion & Modelling Awards 2026",
    "buy fashion show tickets Kenya",
    "Mombasa event tickets",
    "CFM tickets Kilifi",
    "CFM tickets Kwale",
    "CFM tickets Voi",
    "CFM Awards tickets Nairobi",
    "CFM tickets online",
    "Lipa Pole Pole tickets",
    "M-Pesa event tickets Kenya",
    "Paystack tickets Kenya",
    "VVIP VIP Regular CFM tickets",
    "Changer Fusions tickets",
    "Kenya fashion awards tickets",
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
        alt: "Coast Fashion & Modelling Awards — CFM Tickets Kenya",
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
