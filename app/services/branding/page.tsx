"use client";

import { Target } from "lucide-react";
import ServiceDetailTemplate from "@/components/services/ServiceDetailTemplate";
import { useManagedPublicPage } from "@/components/pages/useManagedPublicPage";

const features = [
  "Brand Strategy Development",
  "Logo Design & Identity",
  "Graphic Design Services",
  "Brand Guidelines Creation",
  "Marketing Material Design",
  "Brand Positioning",
  "Visual Identity Systems",
  "Rebranding Services",
];

const benefits = [
  "Strong and memorable brand identity",
  "Consistent brand messaging across all channels",
  "Professional visual design that resonates with your audience",
  "Increased brand recognition and recall",
  "Competitive advantage in the marketplace",
];

export default function BrandingPage() {
  const route = "/services/branding";
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
        title={page?.title || "Branding & Creative Services"}
        heroLabel={page?.hero_label || "BRANDING"}
        description={
          page?.description ||
          "Develop a strong brand identity through strategy development, logo design, and creative assets for your marketing channels."
        }
        featuresTitle={page?.features_title || "OUR BRANDING SERVICES"}
        features={featuresFinal}
        benefitsTitle={page?.benefits_title || "WHY CHOOSE OUR BRANDING SERVICES?"}
        benefits={benefitsFinal}
        ctaTitle={page?.cta_title || "Ready to Build Your Brand?"}
        ctaDescription={page?.cta_description || "Let's create a brand identity that resonates with your audience and drives business growth."}
        icon={Target}
      />
    )
  );
}

