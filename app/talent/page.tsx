"use client";

import TalentHero from "@/components/talent/TalentHero";
import WhatWeRepresent from "@/components/talent/WhatWeRepresent";
import TalentPathways from "@/components/talent/TalentPathways";
import HowToWorkWithUs from "@/components/talent/HowToWorkWithUs";
import BuildingWithTalent from "@/components/talent/BuildingWithTalent";
import CareersContactSection from "@/components/careers/CareersContactSection";

export default function TalentPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <TalentHero />
      <WhatWeRepresent />
      <TalentPathways />
      <HowToWorkWithUs />
      <BuildingWithTalent />
      <CareersContactSection />
    </div>
  );
}
