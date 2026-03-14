import type { Metadata } from "next";
import { getUpcomingEventBySlug } from "@/lib/events-server";
import { EVENTS_BANNER_OG } from "@/lib/og-images";

const CFMA_SLUG = "coast-fashion-modelling-awards-2026";
const SITE_URL = "https://cmfagency.co.ke";

const CFMA_META = {
  title: "Coast Fashion and Modelling Awards 2026 (CMFA) | Buy Tickets | Changer Fusions",
  description:
    "Coast Fashion & Modelling Awards 2026 in Mombasa, Kenya. 15 August 2026. Buy tickets online. Early bird from KES 500. Celebrating heritage, empowering youth talent, sustainable fashion & eco-tourism.",
  image: EVENTS_BANNER_OG.url,
  imageAlt: EVENTS_BANNER_OG.alt,
};

type Props = { params: Promise<{ id?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id: slug } = await params;
  if (!slug) {
    return {
      title: "Event | Changer Fusions",
      openGraph: { images: [EVENTS_BANNER_OG] },
      twitter: { card: "summary_large_image", images: [EVENTS_BANNER_OG.url] },
    };
  }

  if (slug === CFMA_SLUG) {
    return {
      title: CFMA_META.title,
      description: CFMA_META.description,
      openGraph: {
        type: "website",
        title: CFMA_META.title,
        description: CFMA_META.description,
        url: `${SITE_URL}/events/upcoming/${slug}`,
        siteName: "Changer Fusions",
        images: [
          {
            url: CFMA_META.image,
            width: EVENTS_BANNER_OG.width,
            height: EVENTS_BANNER_OG.height,
            alt: CFMA_META.imageAlt,
            type: EVENTS_BANNER_OG.type,
          },
        ],
      },
      twitter: {
        card: "summary_large_image",
        title: CFMA_META.title,
        description: CFMA_META.description,
        images: [CFMA_META.image],
      },
      alternates: { canonical: `${SITE_URL}/events/upcoming/${slug}` },
    };
  }

  const event = await getUpcomingEventBySlug(slug);
  const image =
    event?.image_url || event?.default_image_url || EVENTS_BANNER_OG.url;
  const title = event?.title
    ? `${event.title} | Upcoming Events | Changer Fusions`
    : "Upcoming Event | Changer Fusions";
  const description =
    event?.description ||
    event?.full_description ||
    "Upcoming event by Changer Fusions. View details and get tickets.";

  return {
    title,
    description,
    openGraph: {
      type: "website",
      title,
      description,
      url: `${SITE_URL}/events/upcoming/${slug}`,
      siteName: "Changer Fusions",
      images: [
        {
          url: image,
          width: EVENTS_BANNER_OG.width,
          height: EVENTS_BANNER_OG.height,
          alt: event?.title || "Upcoming Event",
          type: "image/jpeg",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
    alternates: { canonical: `${SITE_URL}/events/upcoming/${slug}` },
  };
}

export default function UpcomingEventIdLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
