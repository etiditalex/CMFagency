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

  const featuresFinal =
    page?.section === "services" && Array.isArray(page.features) ? (page.features as any[]).map((x) => String(x)) : features;
  const benefitsFinal =
    page?.section === "services" && Array.isArray(page.benefits) ? (page.benefits as any[]).map((x) => String(x)) : benefits;

  return (
    loading && !page ? (
      <div className="pt-28 min-h-screen bg-gray-50" />
    ) : (
      <ServiceDetailTemplate
        activeHref={route}
        title={page?.title || "Events Marketing"}
        heroLabel={page?.hero_label || "EVENTS MARKETING"}
        description={
          page?.description ||
          "Plan and manage every stage of your event, from concept and promotion to execution and post-event reporting."
        }
        featuresTitle={page?.features_title || "OUR EVENT MANAGEMENT SCOPE"}
        features={featuresFinal}
        benefitsTitle={page?.benefits_title || "WHY CHOOSE OUR EVENTS MARKETING SERVICES?"}
        benefits={benefitsFinal}
        ctaTitle={page?.cta_title || "Ready to Host an Unforgettable Event?"}
        ctaDescription={page?.cta_description || "Let's plan and execute an event that leaves a lasting impression on your audience."}
        icon={Users}
      />
    )
  );
}

