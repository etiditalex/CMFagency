"use client";

import { Users } from "lucide-react";

import { useManagedPublicPage } from "@/components/pages/useManagedPublicPage";
import CareerDetailTemplate from "@/components/careers/CareerDetailTemplate";
import CareersHero from "@/components/careers/CareersHero";
import WhatIsCareerDevelopment from "@/components/careers/WhatIsCareerDevelopment";
import CareerInCareerDevelopment from "@/components/careers/CareerInCareerDevelopment";
import HowCareerProfessionalCanHelp from "@/components/careers/HowCareerProfessionalCanHelp";
import EmployingWithChangerFusions from "@/components/careers/EmployingWithChangerFusions";
import CareersContactSection from "@/components/careers/CareersContactSection";

export default function CareersPage() {
  const route = "/careers";
  const { loading, page } = useManagedPublicPage(route);

  if (loading && !page) {
    return (
      <div className="pt-28 min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (page?.section === "careers") {
    return (
      <CareerDetailTemplate
        activeHref={route}
        title={page.title || "Careers"}
        heroLabel={page.hero_label || "CAREERS"}
        description={page.description || "Explore careers opportunities."}
        featuresTitle={page.features_title || "FEATURES"}
        features={(Array.isArray(page.features) ? page.features : []).map((x) => String(x))}
        benefitsTitle={page.benefits_title || "BENEFITS"}
        benefits={(Array.isArray(page.benefits) ? page.benefits : []).map((x) => String(x))}
        ctaTitle={page.cta_title || "Get Started"}
        ctaDescription={page.cta_description || "Contact us for more information."}
        icon={Users}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <CareersHero />

      <WhatIsCareerDevelopment />

      <CareerInCareerDevelopment />

      <HowCareerProfessionalCanHelp />

      <EmployingWithChangerFusions />

      <CareersContactSection />
    </div>
  );
}
