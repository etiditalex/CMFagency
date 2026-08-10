"use client";

import dynamic from "next/dynamic";

const galleryPlaceholder = () => (
  <div className="min-h-[200px] bg-gray-50/80 sm:min-h-[240px] md:min-h-[320px]" aria-hidden />
);

const HomeGalleryCarousel = dynamic(() => import("@/components/home/HomeGalleryCarousel"), {
  ssr: false,
  loading: galleryPlaceholder,
});

const PartnersCarousel = dynamic(() => import("@/components/home/PartnersCarousel"), {
  ssr: false,
  loading: galleryPlaceholder,
});

const CareersContactSection = dynamic(
  () => import("@/components/careers/CareersContactSection"),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-[280px] bg-primary-900/30 sm:min-h-[320px]" aria-hidden />
    ),
  }
);

/**
 * Client-only lazy chunks for below-the-fold home sections.
 * `next/dynamic` with `ssr: false` must run inside a Client Component (not `app/page.tsx`).
 */
export function HomeDeferredGallery() {
  return <HomeGalleryCarousel />;
}

export function HomeDeferredPartnersCTA() {
  return (
    <>
      <PartnersCarousel />
      <CareersContactSection />
    </>
  );
}
