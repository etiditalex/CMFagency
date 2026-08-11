"use client";

import CareersContactSection from "@/components/careers/CareersContactSection";
import ServiceShowcaseHero from "./ServiceShowcaseHero";
import ServiceShowcaseBandSection from "./ServiceShowcaseBandSection";
import ServiceShowcaseCollageSection from "./ServiceShowcaseCollageSection";
import type { ServiceShowcaseConfig } from "./types";

type ServiceShowcasePageProps = {
  config: ServiceShowcaseConfig;
};

export default function ServiceShowcasePage({ config }: ServiceShowcasePageProps) {
  const headingId = `${config.route.replace(/\//g, "-").replace(/^-/, "")}-hero-heading`;

  return (
    <div className="min-h-screen bg-gray-50">
      <ServiceShowcaseHero
        watermark={config.watermark}
        title={config.title}
        description={config.heroDescription}
        image={config.heroImage}
        headingId={headingId}
      />

      {config.bands.map((band) => (
        <ServiceShowcaseBandSection key={band.id} band={band} />
      ))}

      <ServiceShowcaseCollageSection
        id={config.collage.id}
        title={config.collage.title}
        paragraphs={config.collage.paragraphs}
        images={config.collage.images}
      />

      <CareersContactSection />
    </div>
  );
}
