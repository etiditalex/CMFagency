import type { Metadata } from "next";
import { getPastEventBySlug } from "@/lib/events-server";
import { EVENTS_BANNER_OG } from "@/lib/og-images";

const SITE_URL = "https://cmfagency.co.ke";
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id: slug } = await params;

  if (!slug) {
    return {
      title: "Past Event | Changer Fusions",
      openGraph: { images: [EVENTS_BANNER_OG] },
      twitter: { card: "summary_large_image", images: [EVENTS_BANNER_OG.url] },
    };
  }

  const event = await getPastEventBySlug(slug);
  const image = `${SITE_URL}/events/past/${slug}/opengraph-image`;

  const title = event?.title
    ? `${event.title} | Past Events | Changer Fusions`
    : "Past Event | Changer Fusions";

  const description =
    event?.description ||
    event?.full_description ||
    "Past event by Changer Fusions. View details and highlights.";

  return {
    title,
    description,
    openGraph: {
      type: "website",
      title,
      description,
      url: `${SITE_URL}/events/past/${slug}`,
      siteName: "Changer Fusions",
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: event?.title || "Past Event",
          type: "image/png",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
    alternates: { canonical: `${SITE_URL}/events/past/${slug}` },
  };
}

export default function PastEventIdLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

