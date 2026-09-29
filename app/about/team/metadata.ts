import { Metadata } from "next";
import { leadershipMembers, TEAM_PAGE_URL } from "./team-data";

const memberNames = leadershipMembers.map((m) => m.name);
const memberTitles = leadershipMembers.map((m) => `${m.name}, ${m.position}`);

const title =
  "Our Team — Javan Rolynce, Alex Etidit, Victoria Mapenzi & Christine Achilah | Changer Fusions";

const description = `Meet the Changer Fusions Board of Directors in Mombasa, Kenya: ${memberTitles.join("; ")}. Leadership for marketing, events, technology, and operations.`;

const ogImage =
  leadershipMembers[0]?.image ??
  "https://res.cloudinary.com/dyfnobo9r/image/upload/v1767009380/Javan_Roylence_a6fnzo.jpg";

export const metadata: Metadata = {
  title,
  description,
  keywords: [
    ...memberNames,
    ...leadershipMembers.flatMap((m) => [
      `${m.name} Changer Fusions`,
      `${m.name} ${m.position}`,
      m.position,
    ]),
    "Changer Fusions team",
    "Changer Fusions Board of Directors",
    "Our Team Changer Fusions",
    "marketing agency team Kenya",
    "events management team Mombasa",
    "Changer Fusions leadership",
    "marketing professionals Kenya",
    "digital marketing experts Kenya",
    "event coordinator Kenya",
    "technical director Kenya marketing agency",
  ],
  authors: leadershipMembers.map((m) => ({ name: m.name, url: `${TEAM_PAGE_URL}#${m.slug}` })),
  creator: "Changer Fusions",
  publisher: "Changer Fusions",
  openGraph: {
    type: "website",
    title,
    description,
    url: TEAM_PAGE_URL,
    siteName: "Changer Fusions",
    locale: "en_KE",
    images: [
      {
        url: ogImage,
        width: 800,
        height: 1000,
        alt: "Javan Rolynce, Founder and CEO of Changer Fusions",
      },
      ...leadershipMembers.slice(1).map((m) => ({
        url: m.image,
        width: 800,
        height: 1000,
        alt: `${m.name}, ${m.position} at Changer Fusions`,
      })),
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: [ogImage],
    site: "@ChangerFusions",
  },
  alternates: {
    canonical: TEAM_PAGE_URL,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};
