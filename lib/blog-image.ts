import type { ImageLoader } from "next/image";

import { cloudinaryLoader } from "@/lib/cloudinary";
import { canOptimizeRemoteImage } from "@/lib/image-hosts";

/** Props so listing/hero images use Cloudinary or the Next optimizer instead of full originals. */
export function blogImageOptimizeProps(src: string): {
  unoptimized?: boolean;
  loader?: ImageLoader;
} {
  if (src.includes("res.cloudinary.com")) {
    return { loader: cloudinaryLoader };
  }
  return { unoptimized: !canOptimizeRemoteImage(src) };
}

/** Direct Cloudinary URL for plain `<img>` tags (promo carousel). */
export function blogOptimizedPlainSrc(src: string, width = 900): string {
  if (!src.includes("res.cloudinary.com")) return src;
  return cloudinaryLoader({ src, width, quality: 72 });
}
