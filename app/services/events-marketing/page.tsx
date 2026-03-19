"use client";

import { Users } from "lucide-react";
import ServiceDetailTemplate from "@/components/services/ServiceDetailTemplate";
import { useManagedPublicPage } from "@/components/pages/useManagedPublicPage";

const features = [
  "Event Concept Development",
  "Planning & Budgeting",
  "Venue Sourcing & Setup",
  "Event Marketing & Promotion",
  "Logistics & Vendor Management",
  "On-site Coordination & Execution",
  "Media Coverage & Documentation",
  "Post-Event Reporting & Evaluation",
];

const benefits = [
  "Successful and memorable events",
  "Increased brand visibility",
  "Enhanced attendee engagement",
  "Measurable event ROI",
  "Professional event execution",
];

export default function EventsMarketingPage() {
  const route = "/services/events-marketing";
  const { loading, page } = useManagedPublicPage(route);
  const isManaged = !!page;

  const featuresFinal = isManaged
    ? Array.isArray(page?.features)
      ? (page!.features as any[]).map((x) => String(x))
      : []
    : features;
  const benefitsFinal = isManaged
    ? Array.isArray(page?.benefits)
      ? (page!.benefits as any[]).map((x) => String(x))
      : []
    : benefits;

  return (
    loading && !page ? (
      <div className="pt-28 min-h-screen bg-gray-50" />
    ) : (
      <ServiceDetailTemplate
        activeHref={route}
        title={isManaged ? page?.title ?? "" : "Events Marketing"}
        heroLabel={isManaged ? page?.hero_label ?? "" : "EVENTS MARKETING"}
        description={
          isManaged
            ? page?.description ?? ""
            : "Plan and manage every stage of your event, from concept and promotion to execution and post-event reporting."
        }
        featuresTitle={isManaged ? page?.features_title ?? "" : "OUR EVENT MANAGEMENT SCOPE"}
        features={featuresFinal}
        benefitsTitle={isManaged ? page?.benefits_title ?? "" : "WHY CHOOSE OUR EVENTS MARKETING SERVICES?"}
        benefits={benefitsFinal}
        ctaTitle={isManaged ? page?.cta_title ?? "" : "Ready to Host an Unforgettable Event?"}
        ctaDescription={
          isManaged ? page?.cta_description ?? "" : "Let's plan and execute an event that leaves a lasting impression on your audience."
        }
        backgroundImageUrl={isManaged ? (page?.background_image_url ?? undefined) ?? undefined : undefined}
        icon={Users}
      />
    )
  );
}

