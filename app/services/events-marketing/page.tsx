"use client";

import { Users } from "lucide-react";
import ServiceDetailTemplate from "@/components/services/ServiceDetailTemplate";
import ServiceShowcasePage from "@/components/services/showcase/ServiceShowcasePage";
import { eventsMarketingShowcase } from "@/components/services/showcase/content/events-marketing";
import { useManagedPublicPage } from "@/components/pages/useManagedPublicPage";

export default function EventsMarketingPage() {
  const route = "/services/events-marketing";
  const { loading, page } = useManagedPublicPage(route);
  const isManaged = !!page;

  if (loading && !page) {
    return <div className="pt-28 min-h-screen bg-gray-50" />;
  }

  if (!isManaged) {
    return <ServiceShowcasePage config={eventsMarketingShowcase} />;
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
      icon={Users}
    />
  );
}
