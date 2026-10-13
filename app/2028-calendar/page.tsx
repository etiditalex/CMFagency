import type { Metadata } from "next";
import Calendar2028JsonLd from "@/components/calendar-2028/Calendar2028JsonLd";
import Calendar2028Sheet from "@/components/calendar-2028/Calendar2028Sheet";
import { CALENDAR_LOGO } from "@/components/calendar-2028/calendar-2028-data";
import { SITE_URL } from "@/lib/site-url";

const PAGE_PATH = "/2028-calendar";
const PAGE_URL = `${SITE_URL}${PAGE_PATH}`;
const DESCRIPTION =
  "2028 Calendar lists Kenya Fashion and Creative Arts Awards host dates, from Coast — Kilifi on 29 April 2028 to Nyanza — Kisumu on 25 November 2028.";

export const metadata: Metadata = {
  title: "2028 Calendar",
  description: DESCRIPTION,
  keywords: [
    "2028 Calendar",
    "Kenya Fashion and Creative Arts Awards",
    "Coast Kilifi",
    "Nairobi Metropolitan",
    "Changer Fusions events",
  ],
  authors: [{ name: "Changer Fusions", url: SITE_URL }],
  creator: "Changer Fusions",
  publisher: "Changer Fusions",
  category: "Events",
  alternates: { canonical: PAGE_URL },
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
    title: "2028 Calendar | Kenya Fashion and Creative Arts Awards",
    description: DESCRIPTION,
    url: PAGE_URL,
    siteName: "Changer Fusions",
    locale: "en_KE",
    type: "website",
    images: [{ url: CALENDAR_LOGO, alt: "Kenya Fashion and Creative Arts Awards" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "2028 Calendar | Kenya Fashion and Creative Arts Awards",
    description: DESCRIPTION,
    images: [CALENDAR_LOGO],
  },
  other: {
    "geo.region": "KE",
    "geo.placename": "Kenya",
  },
};

export default function Calendar2028Page() {
  return (
    <article>
      <Calendar2028JsonLd />
      <Calendar2028Sheet />
    </article>
  );
}
