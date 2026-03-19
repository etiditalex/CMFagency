"use client";

import { Video } from "lucide-react";
import ServiceDetailTemplate from "@/components/services/ServiceDetailTemplate";
import { useManagedPublicPage } from "@/components/pages/useManagedPublicPage";

const features = [
  "Commercial Explainer Videos",
  "Testimonial Videos",
  "Social Media Content",
  "Blog Writing & Articles",
  "Infographic Design",
  "Email Newsletter Content",
  "Product Descriptions",
  "Video Production & Editing",
];

const benefits = [
  "Engaging content that resonates with your audience",
  "Increased brand awareness and visibility",
  "Higher engagement rates on social media",
  "Improved conversion rates",
  "Professional quality content production",
];

export default function ContentCreationPage() {
  const route = "/services/content-creation";
  const { loading, page } = useManagedPublicPage(route);

  const featuresFinal = (page?.section === "services" && Array.isArray(page.features) ? (page.features as any[]).map((x) => String(x)) : features);
  const benefitsFinal = (page?.section === "services" && Array.isArray(page.benefits) ? (page.benefits as any[]).map((x) => String(x)) : benefits);

  return (
    loading && !page ? (
      <div className="pt-28 min-h-screen bg-gray-50" />
    ) : (
      <ServiceDetailTemplate
        activeHref={route}
        title={page?.title || "Content Creation"}
        heroLabel={page?.hero_label || "CONTENT CREATION"}
        description={
          page?.description ||
          "Create engaging content that resonates with your audience, from videos and social posts to written campaigns."
        }
        featuresTitle={page?.features_title || "OUR CONTENT CREATION SERVICES"}
        features={featuresFinal}
        benefitsTitle={page?.benefits_title || "WHY CHOOSE OUR CONTENT CREATION SERVICES?"}
        benefits={benefitsFinal}
        ctaTitle={page?.cta_title || "Ready to Create Compelling Content?"}
        ctaDescription={page?.cta_description || "Let's create content that tells your story and engages your audience."}
        icon={Video}
      />
    )
  );
}

