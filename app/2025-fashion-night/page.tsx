import type { Metadata } from "next";
import FashionNightGallery from "@/components/fashion-night/FashionNightGallery";
import FashionNightHero from "@/components/fashion-night/FashionNightHero";
import FashionNightJsonLd from "@/components/fashion-night/FashionNightJsonLd";
import FashionNightNotice from "@/components/fashion-night/FashionNightNotice";
import FashionNightPast from "@/components/fashion-night/FashionNightPast";
import FashionNightPlace from "@/components/fashion-night/FashionNightPlace";
import FashionNightStory from "@/components/fashion-night/FashionNightStory";
import { SITE_URL } from "@/lib/site-url";

const PAGE_PATH = "/2025-fashion-night";
const PAGE_URL = `${SITE_URL}${PAGE_PATH}`;
const SHARE_IMAGE =
  "https://res.cloudinary.com/dyfnobo9r/image/upload/v1767037227/CoastFashionsandmodellingawards1_bdf13y.jpg";
const DESCRIPTION =
  "2025 Fashion Night is Changer Fusions' look back at the Coast Fashion and Modelling Awards 2025, the first coast awards night, held on 15 May 2025 in Mombasa, Coast Region, Kenya.";

export const metadata: Metadata = {
  title: "2025 Fashion Night",
  description: DESCRIPTION,
  keywords: [
    "2025 Fashion Night",
    "Coast Fashion and Modelling Awards 2025",
    "Coast Fashion Awards",
    "fashion awards Mombasa",
    "fashion event Coast Region Kenya",
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
    title: "2025 Fashion Night | Coast Fashion and Modelling Awards 2025",
    description: DESCRIPTION,
    url: PAGE_URL,
    siteName: "Changer Fusions",
    locale: "en_KE",
    type: "website",
    images: [
      {
        url: SHARE_IMAGE,
        alt: "Coast Fashion and Modelling Awards 2025 in the Coast Region, Kenya",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "2025 Fashion Night | Coast Fashion and Modelling Awards 2025",
    description: DESCRIPTION,
    images: [SHARE_IMAGE],
  },
  other: {
    "geo.region": "KE",
    "geo.placename": "Mombasa, Coast Region, Kenya",
    "geo.position": "-4.0435;39.6682",
    ICBM: "-4.0435, 39.6682",
  },
};

export default function FashionNight2025Page() {
  return (
    <article className="fashion-night-page pt-[var(--site-nav-height)]">
      <FashionNightJsonLd />
      <FashionNightNotice />
      <FashionNightHero />
      <FashionNightStory />
      <FashionNightPlace />
      <FashionNightGallery />
      <FashionNightPast />
    </article>
  );
}
