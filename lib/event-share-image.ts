const SITE_ORIGIN =
  (typeof process.env.NEXT_PUBLIC_SITE_URL === "string" && process.env.NEXT_PUBLIC_SITE_URL.trim()) ||
  "https://cmfagency.co.ke";

function siteBase(): string {
  return SITE_ORIGIN.replace(/\/$/, "");
}

/**
 * Absolute URL for og:image / Twitter cards. Prefer the real Fusion Xpress poster
 * so crawlers load it directly; fall back to the generated opengraph-image route.
 */
export function resolveEventShareImageUrl(options: {
  imageUrl: string | null | undefined;
  defaultImageUrl?: string | null | undefined;
  galleryFirst?: string | null | undefined;
  generatedOgImageUrl: string;
}): string {
  const candidates = [options.imageUrl, options.defaultImageUrl, options.galleryFirst];
  for (const raw of candidates) {
    const trimmed = raw?.trim();
    if (!trimmed) continue;
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    if (trimmed.startsWith("//")) return `https:${trimmed}`;
    if (trimmed.startsWith("/")) return `${siteBase()}${trimmed}`;
  }
  return options.generatedOgImageUrl;
}
