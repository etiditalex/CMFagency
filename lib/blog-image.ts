import { canOptimizeRemoteImage } from "@/lib/image-hosts";
import { DEFAULT_BLOG_CARD_IMAGE } from "@/lib/blog-defaults";

/** Serializable Image props only — never pass a `loader` function from a Server Component. */
export function blogImageOptimizeProps(src: string): { unoptimized: boolean } {
  if (src.startsWith("/api/") || src.startsWith("data:")) return { unoptimized: true };
  return { unoptimized: !canOptimizeRemoteImage(src) };
}

function toHttpsImageUrl(raw: string): string {
  if (raw.startsWith("//")) return `https:${raw}`;
  if (raw.startsWith("http://")) return `https://${raw.slice(7)}`;
  return raw;
}

/**
 * Public blog image src. Keeps the stored photo (including dashboard data-URL uploads
 * via `/api/blogs/og-image`) instead of substituting the default card image.
 */
export function resolveBlogImageSrc(
  src: string | null | undefined,
  fallback: string = DEFAULT_BLOG_CARD_IMAGE,
  slug?: string
): string {
  const raw = (src ?? "").trim();
  if (!raw) return fallback;
  if (raw.startsWith("data:")) {
    if (slug) return `/api/blogs/og-image?slug=${encodeURIComponent(slug)}`;
    return fallback;
  }
  const https = toHttpsImageUrl(raw);
  if (https.startsWith("https://") || https.startsWith("/")) return https;
  return fallback;
}

/** Promo `<img>` tags: keep the original URL, only force https. */
export function blogOptimizedPlainSrc(src: string): string {
  const raw = src.trim();
  if (!raw) return src;
  return toHttpsImageUrl(raw);
}
