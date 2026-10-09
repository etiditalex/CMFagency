import type { Metadata } from "next";
import { SITE_URL } from "@/lib/site-url";

const SHARE_IMAGE = "/images/poll-hero-ballot.jpg";

export function pollPageMetadata(input: {
  title: string;
  description: string;
  path: string;
  keywords: string[];
  index?: boolean;
}): Metadata {
  const url = `${SITE_URL}${input.path}`;
  const index = input.index !== false;
  return {
    title: input.title,
    description: input.description,
    keywords: input.keywords,
    alternates: { canonical: url },
    robots: index
      ? {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            "max-image-preview": "large",
            "max-snippet": -1,
            "max-video-preview": -1,
          },
        }
      : { index: false, follow: false, nocache: true },
    openGraph: {
      type: "website",
      locale: "en_KE",
      url,
      siteName: "Changer Fusions",
      title: input.title,
      description: input.description,
      images: [{ url: SHARE_IMAGE, width: 1200, height: 630, alt: "Changer Fusions polls" }],
    },
    twitter: {
      card: "summary_large_image",
      title: input.title,
      description: input.description,
      images: [SHARE_IMAGE],
    },
  };
}
