"use client";

import { TrendingUp } from "lucide-react";
import ServiceDetailTemplate from "@/components/services/ServiceDetailTemplate";
import { useManagedPublicPage } from "@/components/pages/useManagedPublicPage";

const features = [
  "Social Media Marketing",
  "Email Marketing Campaigns",
  "Online Reputation Management",
  "Search Engine Optimization (SEO)",
  "Pay-Per-Click (PPC) Advertising",
  "Content Marketing Strategy",
  "Social Media Analytics",
  "Conversion Rate Optimization",
];

const benefits = [
  "Increased brand visibility and awareness",
  "Higher engagement rates with target audience",
  "Improved ROI on marketing spend",
  "Data-driven marketing strategies",
  "Multi-channel marketing approach",
];

export default function DigitalMarketingPage() {
  const route = "/services/digital-marketing";
  const { loading, page } = useManagedPublicPage(route);

  const featuresFinal = (page?.section === "services" && Array.isArray(page.features) ? (page.features as any[]).map((x) => String(x)) : features);
  const benefitsFinal = (page?.section === "services" && Array.isArray(page.benefits) ? (page.benefits as any[]).map((x) => String(x)) : benefits);

  return (
    loading && !page ? (
      <div className="pt-28 min-h-screen bg-gray-50" />
    ) : (
      <ServiceDetailTemplate
        activeHref={route}
        title={page?.title || "Digital Marketing"}
        heroLabel={page?.hero_label || "DIGITAL MARKETING"}
        description={
          page?.description ||
          "Reach your target audience effectively through social media marketing, email campaigns, and online reputation management. We help businesses establish a strong digital presence and drive meaningful engagement."
        }
        featuresTitle={page?.features_title || "OUR DIGITAL MARKETING SERVICES"}
        features={featuresFinal}
        benefitsTitle={page?.benefits_title || "WHY CHOOSE OUR DIGITAL MARKETING SERVICES?"}
        benefits={benefitsFinal}
        ctaTitle={page?.cta_title || "Ready to Grow Your Digital Presence?"}
        ctaDescription={page?.cta_description || "Let's discuss how our digital marketing services can help your business thrive in the digital landscape."}
        icon={TrendingUp}
      />
    )
  );
}

