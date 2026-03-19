"use client";

import { BarChart } from "lucide-react";
import ServiceDetailTemplate from "@/components/services/ServiceDetailTemplate";
import { useManagedPublicPage } from "@/components/pages/useManagedPublicPage";

const features = [
  "Consumer Behavior Analysis",
  "Competitor Analysis",
  "Marketing Trend Research",
  "Data Analytics & Reporting",
  "Marketing Strategy Development",
  "Market Entry & Expansion Strategies",
  "Customer Segmentation",
  "Market Opportunity Assessment",
];

const benefits = [
  "Data-driven marketing decisions",
  "Better understanding of your target audience",
  "Competitive advantage through insights",
  "Reduced marketing risks",
  "Optimized marketing spend and ROI",
];

export default function MarketResearchPage() {
  const route = "/services/market-research";
  const { loading, page } = useManagedPublicPage(route);

  const featuresFinal = (page?.section === "services" && Array.isArray(page.features) ? (page.features as any[]).map((x) => String(x)) : features);
  const benefitsFinal = (page?.section === "services" && Array.isArray(page.benefits) ? (page.benefits as any[]).map((x) => String(x)) : benefits);

  return (
    loading && !page ? (
      <div className="pt-28 min-h-screen bg-gray-50" />
    ) : (
      <ServiceDetailTemplate
        activeHref={route}
        title={page?.title || "Market Research & Analysis"}
        heroLabel={page?.hero_label || "MARKET RESEARCH"}
        description={
          page?.description ||
          "Conduct in-depth research to understand your target audience, competitors, and trends so your marketing strategy is based on evidence."
        }
        featuresTitle={page?.features_title || "OUR MARKET RESEARCH SERVICES"}
        features={featuresFinal}
        benefitsTitle={page?.benefits_title || "WHY CHOOSE OUR MARKET RESEARCH SERVICES?"}
        benefits={benefitsFinal}
        ctaTitle={page?.cta_title || "Ready to Make Data-Driven Decisions?"}
        ctaDescription={page?.cta_description || "Let's uncover insights that will drive your marketing strategy and business growth."}
        icon={BarChart}
      />
    )
  );
}

