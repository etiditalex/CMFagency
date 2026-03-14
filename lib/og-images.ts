/**
 * Canonical Open Graph / Twitter card images for link sharing.
 * Use 1200×630 for best display as attachment when sharing event links.
 */

/** Events section & upcoming events list – banner shown when sharing /events or /events/upcoming */
export const EVENTS_BANNER_OG = {
  url: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1768448265/HighFashionAudition202514_kwly2p.jpg",
  width: 1200,
  height: 630,
  alt: "Coast Fashion and Modelling Awards 2026 (CMFA) – Upcoming Events | Changer Fusions",
  type: "image/jpeg" as const,
};

/** Full absolute URL for use in og:image / twitter:image (some crawlers require absolute URL) */
export function eventsBannerOgUrl(): string {
  return EVENTS_BANNER_OG.url;
}
