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

/**
 * Hero frames are often 640px wide and were being stretched by the browser.
 * Scale them up on Cloudinary, then sharpen, and cap the request so a
 * high-density screen does not ask for a 3840px upscale of a small photo.
 */
export function cloudinaryLoaderHero({ src, width, quality }: ImageLoaderProps): string {
  if (!src.includes("res.cloudinary.com")) return src;
  const q = quality ?? 90;
  const w = Math.min(Math.max(width, 1), 2400);
  return src.replace(
    /(https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(.*)/,
    `$1c_scale,w_${w},q_${q},f_auto/e_unsharp_mask:80/$2`
  );
}

/** Smaller payloads for below-the-fold marketing images (eco quality, AVIF/WebP). */
export function cloudinaryLoaderEco({ src, width }: ImageLoaderProps): string {
  if (!src.includes("res.cloudinary.com")) return src;
  return src.replace(
    /(https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(.*)/,
    `$1f_auto,q_auto:eco,w_${width},c_limit/$2`
  );
}

export function cloudinarySizedUrl(src: string, width: number): string {
  return cloudinaryLoaderEco({ src, width });
}
