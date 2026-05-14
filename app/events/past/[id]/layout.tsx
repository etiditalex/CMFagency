import type { Metadata } from "next";
import { resolveEventShareImageUrl } from "@/lib/event-share-image";
import { getFusionEventShareFieldsBySlug, getPastEventBySlug } from "@/lib/events-server";
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
  const shareFallback = event ? null : await getFusionEventShareFieldsBySlug(slug);
  const imageUrl = event?.image_url ?? shareFallback?.image_url ?? null;
  const defaultImageUrl = event?.default_image_url ?? shareFallback?.default_image_url ?? null;
  const gallerySource = event?.gallery ?? shareFallback?.gallery;
  const galleryFirst =
    Array.isArray(gallerySource) && gallerySource.length > 0
      ? String(gallerySource[0])
      : null;
  const generatedOg = `${SITE_URL}/events/past/${slug}/opengraph-image`;
  const shareImage = resolveEventShareImageUrl({
    imageUrl,
    defaultImageUrl,
    galleryFirst,
    slug,
    generatedOgImageUrl: generatedOg,
  });

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
        shareImage === generatedOg
          ? {
              url: shareImage,
              width: 1200,
              height: 630,
              alt: event?.title || "Past Event",
              type: "image/png",
            }
          : { url: shareImage, alt: event?.title || "Past Event" },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [shareImage],
    },
    alternates: { canonical: `${SITE_URL}/events/past/${slug}` },
  };
}

export default function PastEventIdLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

