import type { Metadata } from "next";
import FashionShowGallery from "@/components/fashion-show/FashionShowGallery";
import FashionShowHero from "@/components/fashion-show/FashionShowHero";
import FashionShowJsonLd from "@/components/fashion-show/FashionShowJsonLd";
import FashionShowNotice from "@/components/fashion-show/FashionShowNotice";
import FashionShowPlace from "@/components/fashion-show/FashionShowPlace";
import FashionShowStory from "@/components/fashion-show/FashionShowStory";
import FashionShowTickets from "@/components/fashion-show/FashionShowTickets";
import { SITE_URL } from "@/lib/site-url";

const PAGE_PATH = "/2026-fashion-show";
const PAGE_URL = `${SITE_URL}${PAGE_PATH}`;
const SHARE_IMAGE =
  "https://res.cloudinary.com/dyfnobo9r/image/upload/v1791840047/2026_Coast_Fashion_Show_7_kmoxak.jpg";
const DESCRIPTION =
  "2026 Fashion Show looks back at the Coast Fashion and Modelling Awards 2026, held on 15 August 2026 at City Blue Creekside Hotel, Mombasa. Celebrating heritage, youth talent, sustainable fashion, and eco-tourism.";

export const metadata: Metadata = {
  title: "2026 Fashion Show",
  description: DESCRIPTION,
  keywords: [
    "2026 Fashion Show",
    "Coast Fashion and Modelling Awards 2026",
    "CFMA 2026",
    "fashion show Mombasa",
    "City Blue Creekside Hotel",
    "Changer Fusions events",
    "Mombasa fashion",
  ],
  authors: [{ name: "Changer Fusions", url: SITE_URL }],
  creator: "Changer Fusions",
  publisher: "Changer Fusions",
  category: "Events",
  alternates: {
    canonical: PAGE_URL,
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
    title: "2026 Fashion Show | Coast Fashion and Modelling Awards 2026",
    description: DESCRIPTION,
    url: PAGE_URL,
    siteName: "Changer Fusions",
    locale: "en_KE",
    type: "website",
    images: [
      {
        url: SHARE_IMAGE,
        alt: "2026 Fashion Show in Mombasa",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "2026 Fashion Show | Coast Fashion and Modelling Awards 2026",
    description: DESCRIPTION,
    images: [SHARE_IMAGE],
  },
  other: {
    "geo.region": "KE",
    "geo.placename": "City Blue Creekside Hotel, Mombasa, Kenya",
    "geo.position": "-4.0435;39.6682",
    ICBM: "-4.0435, 39.6682",
  },
};

export default function FashionShow2026Page() {
  return (
    <article className="fashion-night-page">
      <FashionShowJsonLd />
      <FashionShowNotice />
      <FashionShowHero />
      <FashionShowStory />
      <FashionShowPlace />
      <FashionShowGallery />
      <FashionShowTickets />
    </article>
  );
}
