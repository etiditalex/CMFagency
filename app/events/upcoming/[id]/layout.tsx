import type { Metadata } from "next";
import CoastFlashSaleStructuredData from "@/components/CoastFlashSaleStructuredData";
import { resolveEventShareImageUrl } from "@/lib/event-share-image";
import { getFusionEventShareFieldsBySlug, getUpcomingEventBySlug } from "@/lib/events-server";
import { EVENTS_BANNER_OG } from "@/lib/og-images";

const CFMA_SLUG = "coast-fashion-modelling-awards-2026";
const FLASH_SALE_SLUG = "coast-fashion-and-modelling-awards-2026-flash-sale";
const SITE_URL = "https://cmfagency.co.ke";
const FLASH_SALE_URL = `${SITE_URL}/events/upcoming/${FLASH_SALE_SLUG}`;
export const dynamic = "force-dynamic";

const CFMA_META = {
  title: "Coast Fashion and Modelling Awards 2026 (CMFA) | Buy Tickets | Changer Fusions",
  description:
    "Coast Fashion & Modelling Awards 2026 in Mombasa, Kenya. 15 August 2026. Buy tickets online. Early bird from KES 500. Celebrating heritage, empowering youth talent, sustainable fashion & eco-tourism.",
  image: EVENTS_BANNER_OG.url,
  imageAlt: EVENTS_BANNER_OG.alt,
};

/** SEO-only metadata — not shown in page UI. Targets flash-sale search queries. */
const FLASH_SALE_META = {
  title:
    "Coast Fashion Flash Sale Tickets | Group of 5 at 1500 & Group of 10 at 3000 | Changer Fusions",
  description:
    "Coast fashion flash sale tickets for Coast Fashion and Modelling Awards 2026. Coast tickets flash sale and coast event flash sale now on — group of 5 at 1500, group of 10 at 3000. Buy flash sale tickets online at CMF Agency.",
  keywords: [
    "coast fashion flash sale tickets",
    "coast tickets flash sale",
    "coast event flash sale",
    "group of 5 at 1500",
    "group of 10 at 3000",
    "coast fashion flash sale",
    "CFMA flash sale tickets",
    "Coast Fashion and Modelling Awards flash sale",
    "Mombasa fashion event tickets flash sale",
  ],
  image: EVENTS_BANNER_OG.url,
  imageAlt:
    "Coast fashion flash sale tickets — coast tickets flash sale, group of 5 at 1500, group of 10 at 3000",
};

type Props = { params: Promise<{ id?: string }>; children: React.ReactNode };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id: slug } = await params;
  if (!slug) {
    return {
      title: "Event | Changer Fusions",
      openGraph: { images: [EVENTS_BANNER_OG] },
      twitter: { card: "summary_large_image", images: [EVENTS_BANNER_OG.url] },
    };
  }

  if (slug === FLASH_SALE_SLUG) {
    const flashLive = await getUpcomingEventBySlug(FLASH_SALE_SLUG);
    if (!flashLive) {
      return {
        title: "Event unavailable | Changer Fusions",
        robots: { index: false, follow: false },
        openGraph: { images: [EVENTS_BANNER_OG] },
        twitter: { card: "summary_large_image", images: [EVENTS_BANNER_OG.url] },
      };
    }
    return {
      title: FLASH_SALE_META.title,
      description: FLASH_SALE_META.description,
      keywords: FLASH_SALE_META.keywords,
      authors: [{ name: "Changer Fusions", url: SITE_URL }],
      creator: "Changer Fusions",
      publisher: "CMF Agency",
      category: "Events",
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
        locale: "en_KE",
        title: FLASH_SALE_META.title,
        description: FLASH_SALE_META.description,
        url: FLASH_SALE_URL,
        siteName: "Changer Fusions | CMF Agency",
        images: [
          {
            url: FLASH_SALE_META.image,
            width: EVENTS_BANNER_OG.width,
            height: EVENTS_BANNER_OG.height,
            alt: FLASH_SALE_META.imageAlt,
            type: EVENTS_BANNER_OG.type,
          },
        ],
      },
      twitter: {
        card: "summary_large_image",
        title: "Coast Fashion Flash Sale Tickets | Group of 5 at 1500",
        description:
          "Coast tickets flash sale & coast event flash sale — group of 5 at 1500, group of 10 at 3000. Buy online.",
        images: [FLASH_SALE_META.image],
      },
      alternates: {
        canonical: FLASH_SALE_URL,
        languages: {
          "en-KE": FLASH_SALE_URL,
          en: FLASH_SALE_URL,
        },
      },
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
  const shareFallback = event ? null : await getFusionEventShareFieldsBySlug(slug);
  const imageUrl = event?.image_url ?? shareFallback?.image_url ?? null;
  const defaultImageUrl = event?.default_image_url ?? shareFallback?.default_image_url ?? null;
  const generatedOg = `${SITE_URL}/events/upcoming/${slug}/opengraph-image`;
  const shareImage = resolveEventShareImageUrl({
    imageUrl,
    defaultImageUrl,
    slug,
    generatedOgImageUrl: generatedOg,
  });
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
        shareImage === generatedOg
          ? {
              url: shareImage,
              width: 1200,
              height: 630,
              alt: event?.title || "Upcoming Event",
              type: "image/png",
            }
          : { url: shareImage, alt: event?.title || "Upcoming Event" },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [shareImage],
    },
    alternates: { canonical: `${SITE_URL}/events/upcoming/${slug}` },
  };
}

export default async function UpcomingEventIdLayout({ children, params }: Props) {
  const { id: slug } = await params;
  const showFlashSeo =
    slug === FLASH_SALE_SLUG ? Boolean(await getUpcomingEventBySlug(FLASH_SALE_SLUG)) : false;

  return (
    <>
      {showFlashSeo ? <CoastFlashSaleStructuredData /> : null}
      {children}
    </>
  );
}
