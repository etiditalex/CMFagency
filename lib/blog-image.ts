import { cloudinaryLoader } from "@/lib/cloudinary";
import { canOptimizeRemoteImage } from "@/lib/image-hosts";
import { DEFAULT_BLOG_CARD_IMAGE } from "@/lib/blog-defaults";

/** Serializable Image props only — never pass a `loader` function from a Server Component. */
export function blogImageOptimizeProps(src: string): { unoptimized: boolean } {
  if (src.includes("res.cloudinary.com")) {
    return { unoptimized: true };
  }
  return { unoptimized: !canOptimizeRemoteImage(src) };
}

function toHttpsImageUrl(raw: string): string {
  if (raw.startsWith("//")) return `https:${raw}`;
  if (raw.startsWith("http://")) return `https://${raw.slice(7)}`;
  return raw;
}

/** Safe `src` for next/image. Data URLs and empty values fall back so SSR cannot throw. */
export function resolveBlogImageSrc(
  src: string | null | undefined,
  fallback: string = DEFAULT_BLOG_CARD_IMAGE,
  width = 800
): string {
  const raw = (src ?? "").trim();
  if (!raw || raw.startsWith("data:")) return fallback;
  const https = toHttpsImageUrl(raw);
  if (https.includes("res.cloudinary.com")) {
    return cloudinaryLoader({ src: https, width, quality: 72 });
  }
  return https;
}

/** Direct Cloudinary URL for plain `<img>` tags (promo carousel). */
export function blogOptimizedPlainSrc(src: string, width = 900): string {
  return resolveBlogImageSrc(src, src, width);
}
