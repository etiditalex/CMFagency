/** Default OG / listing hero when a post has no shareable image. */
export const DEFAULT_BLOG_SHARE_IMAGE =
  "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765955876/WhatsApp_Image_2025-12-17_at_9.31.49_AM_m3hebl.jpg";

const SITE_ORIGIN =
  (typeof process.env.NEXT_PUBLIC_SITE_URL === "string" && process.env.NEXT_PUBLIC_SITE_URL.trim()) ||
  "https://cmfagency.co.ke";

function siteBase(): string {
  return SITE_ORIGIN.replace(/\/$/, "");
}

/**
 * Absolute URL for og:image / Twitter cards. Social crawlers require https (not data: URLs).
 * Uploaded dashboard images are stored as data URLs — those map to /api/blogs/og-image?slug=...
 */
export function resolveBlogShareImageUrl(slug: string, imageUrl: string | null | undefined): string {
  const trimmed = imageUrl?.trim();
  if (!trimmed) return DEFAULT_BLOG_SHARE_IMAGE;

  if (trimmed.startsWith("data:")) {
    return `${siteBase()}/api/blogs/og-image?slug=${encodeURIComponent(slug)}`;
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  if (trimmed.startsWith("//")) {
    return `https:${trimmed}`;
  }

  if (trimmed.startsWith("/")) {
    return `${siteBase()}${trimmed}`;
  }

  return DEFAULT_BLOG_SHARE_IMAGE;
}
