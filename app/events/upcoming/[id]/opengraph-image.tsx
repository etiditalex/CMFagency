import { ImageResponse } from "next/og";
import { shareableEventImageUrlForOgRender } from "@/lib/event-share-image";
import { getFusionEventShareFieldsBySlug, getUpcomingEventBySlug } from "@/lib/events-server";
import { EVENTS_BANNER_OG } from "@/lib/og-images";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

type Props = { params: Promise<{ id?: string }> };

export default async function OpenGraphImage({ params }: Props) {
  const { id: slug } = await params;
  const event = slug ? await getUpcomingEventBySlug(slug) : null;
  const shareFields = event || !slug ? null : await getFusionEventShareFieldsBySlug(slug);
  const primary =
    event?.image_url ||
    event?.default_image_url ||
    shareFields?.image_url ||
    shareFields?.default_image_url ||
    null;
  const image =
    shareableEventImageUrlForOgRender(primary, slug ?? null) || EVENTS_BANNER_OG.url;
  const title = event?.title || "Upcoming Event";
  const subtitle =
    event?.location || event?.event_date || "Changer Fusions";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          background: "#ffffff",
          color: "#111827",
        }}
      >
        <img
          src={image}
          alt=""
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(180deg, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0.18) 40%, rgba(0,0,0,0.82) 100%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 48,
            right: 48,
            bottom: 40,
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <div
            style={{
              color: "rgba(255,255,255,0.9)",
              fontSize: 26,
              fontWeight: 700,
            }}
          >
            Upcoming Event
          </div>
          <div
            style={{
              color: "#ffffff",
              fontSize: 58,
              lineHeight: 1.05,
              fontWeight: 900,
              maxWidth: 980,
            }}
          >
            {title}
          </div>
          <div
            style={{
              color: "rgba(255,255,255,0.92)",
              fontSize: 28,
              fontWeight: 600,
            }}
          >
            {subtitle}
          </div>
        </div>
      </div>
    ),
    size
  );
}

