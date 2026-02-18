import type { ImageLoaderProps } from "next/image";

/**
 * Cloudinary loader for Next.js Image: adds q_auto,f_auto for automatic
 * format (WebP/AVIF) and quality optimization, reducing image size significantly.
 */
export function cloudinaryLoader({ src, width, quality }: ImageLoaderProps): string {
  if (!src.includes("res.cloudinary.com")) return src;
  const q = quality ?? 75;
  return src.replace(
    /(https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(.*)/,
    `$1q_auto,f_auto,w_${width},q_${q},c_limit/$2`
  );
}
