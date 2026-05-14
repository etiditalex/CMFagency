const SITE_ORIGIN =
  (typeof process.env.NEXT_PUBLIC_SITE_URL === "string" && process.env.NEXT_PUBLIC_SITE_URL.trim()) ||
  "https://cmfagency.co.ke";

function siteBase(): string {
  return SITE_ORIGIN.replace(/\/$/, "");
}

/**
 * Absolute URL for og:image / Twitter cards. Prefer the real Fusion Xpress poster
 * so crawlers load it directly; fall back to the generated opengraph-image route.
 *
 * Dashboard uploads are stored as `data:image/...;base64,...` — crawlers cannot use
 * those; when `slug` is set we point at `/events/share-image/[slug]` which serves bytes over HTTPS.
 */
export function resolveEventShareImageUrl(options: {
  imageUrl: string | null | undefined;
  defaultImageUrl?: string | null | undefined;
  galleryFirst?: string | null | undefined;
  /** Required for data URL posters so og:image is a fetchable HTTPS URL. */
  slug?: string;
  generatedOgImageUrl: string;
}): string {
  const candidates = [options.imageUrl, options.defaultImageUrl, options.galleryFirst];
  for (const raw of candidates) {
    const trimmed = raw?.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith("data:") && options.slug) {
      return `${siteBase()}/events/share-image/${encodeURIComponent(options.slug)}`;
    }
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    if (trimmed.startsWith("//")) return `https:${trimmed}`;
    if (trimmed.startsWith("/")) return `${siteBase()}${trimmed}`;
  }
  return options.generatedOgImageUrl;
}

/** For `next/og` ImageResponse: Edge cannot reliably embed `data:` URLs; use HTTPS proxy instead. */
export function shareableEventImageUrlForOgRender(
  raw: string | null | undefined,
  slug: string | null | undefined
): string {
  const trimmed = raw?.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("data:") && slug) {
    return `${siteBase()}/events/share-image/${encodeURIComponent(slug)}`;
  }
  return trimmed;
}
