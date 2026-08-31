"use client";

import dynamic from "next/dynamic";

const CareersContactSection = dynamic(
  () => import("@/components/careers/CareersContactSection"),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-[280px] bg-primary-900/30 sm:min-h-[360px] md:min-h-[420px]" aria-hidden />
    ),
  }
);

/** Contact form is below the fold — keep it out of the first JS/CSS paint. */
export default function DownloadDeferredContact() {
  return <CareersContactSection />;
}
