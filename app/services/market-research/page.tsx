"use client";

import { BarChart } from "lucide-react";
import ServiceDetailTemplate from "@/components/services/ServiceDetailTemplate";
import ServiceShowcasePage from "@/components/services/showcase/ServiceShowcasePage";
import { marketResearchShowcase } from "@/components/services/showcase/content/market-research";
import { useManagedPublicPage } from "@/components/pages/useManagedPublicPage";

export default function MarketResearchPage() {
  const route = "/services/market-research";
  const { loading, page } = useManagedPublicPage(route);
  const isManaged = !!page;

  if (loading && !page) {
    return <div className="pt-28 min-h-screen bg-gray-50" />;
  }

  if (!isManaged) {
    return <ServiceShowcasePage config={marketResearchShowcase} />;
  }

  const featuresFinal = Array.isArray(page?.features)
    ? (page!.features as any[]).map((x) => String(x))
    : [];
  const benefitsFinal = Array.isArray(page?.benefits)
    ? (page!.benefits as any[]).map((x) => String(x))
    : [];

  return (
    <ServiceDetailTemplate
      activeHref={route}
      title={page?.title ?? ""}
      heroLabel={page?.hero_label ?? ""}
      description={page?.description ?? ""}
      featuresTitle={page?.features_title ?? ""}
      features={featuresFinal}
      benefitsTitle={page?.benefits_title ?? ""}
      benefits={benefitsFinal}
      ctaTitle={page?.cta_title ?? ""}
      ctaDescription={page?.cta_description ?? ""}
      backgroundImageUrl={page.background_image_url ?? undefined}
      icon={BarChart}
    />
  );
}
