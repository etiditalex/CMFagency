"use client";

import { PromoSlideCard } from "@/components/blogs/BlogPromoCarousel";
import type { BlogSidebarAdRow } from "@/lib/blog-server";

type Props = {
  ads: BlogSidebarAdRow[];
  className?: string;
  imageMaxClass?: string;
};

/**
 * Horizontally scrollable promo strip (scroll-snap). For /blogs listing.
 */
export default function BlogPromoHorizontalScroll({
  ads,
  className = "",
  imageMaxClass = "max-h-[min(200px,36dvh)] sm:max-h-[min(240px,40dvh)]",
}: Props) {
  if (ads.length === 0) return null;

  return (
    <div className={`space-y-2 ${className}`}>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-0.5">
        Promotions {ads.length > 1 ? `(${ads.length}) — scroll` : ""}
      </p>
      <div
        className="flex gap-3 sm:gap-4 overflow-x-auto pb-2 snap-x snap-mandatory [scrollbar-width:thin] [scrollbar-color:rgba(156,163,175,0.8)_transparent] -mx-1 px-1"
        role="region"
        aria-label="Scrollable promotions"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {ads.map((ad) => (
          <div
            key={ad.id}
            className="snap-center shrink-0 w-[min(88vw,380px)] sm:w-[min(72vw,400px)] md:w-[min(400px,45vw)]"
          >
            <PromoSlideCard ad={ad} imageMaxClass={imageMaxClass} className="h-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
