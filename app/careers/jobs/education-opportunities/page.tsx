"use client";

import { BookOpen, Users } from "lucide-react";

import { CareerTrackJobsFallback } from "@/components/careers/CareerTrackJobsFallback";
import { useManagedPublicPage } from "@/components/pages/useManagedPublicPage";
import CareerDetailTemplate from "@/components/careers/CareerDetailTemplate";

export default function EducationOpportunitiesPage() {
  const route = "/careers/jobs/education-opportunities";
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
        title={page.title || "Education Job Opportunities"}
        heroLabel={page.hero_label || "EDUCATION (JOBS)"}
        description={page.description || "Explore exciting education job opportunities at CMF Agency."}
        featuresTitle={page.features_title || "FEATURES"}
        features={(Array.isArray(page.features) ? page.features : []).map((x) => String(x))}
        benefitsTitle={page.benefits_title || "BENEFITS"}
        benefits={(Array.isArray(page.benefits) ? page.benefits : []).map((x) => String(x))}
        ctaTitle={page.cta_title || "Get Started"}
        ctaDescription={page.cta_description || "Contact us for more information about these roles."}
        icon={Users}
      />
    );
  }

  return (
    <CareerTrackJobsFallback
      backHref="/careers/jobs"
      backLabel="Back to Jobs"
      title="Education, training, and facilitation roles"
      subtitle="Help teams and communities build skills in marketing, leadership, and digital literacy."
      intro="We run educational touchpoints alongside our events and corporate programmes: student engagements, leadership sessions, and practical workshops for SMEs. Facilitators translate agency methodologies into clear sessions participants can reuse—without turning classes into pure sales pitches for our services."
      icon={BookOpen}
      positions={[
        "Workshop facilitator (marketing fundamentals, personal brand, digital safety)",
        "Training programme coordinator and curriculum assistant",
        "Corporate learning liaison for client-specific academies",
        "Speaker and moderator support for conferences we produce",
        "Content developer for learner handouts and follow-up resources",
      ]}
      requirements={[
        "Experience teaching, training, or mentoring adults or tertiary students",
        "Subject matter depth in business, communication, or digital tools—or a credible mix",
        "Patient facilitation style and respect for diverse literacy levels",
        "Willingness to align materials with client brand and compliance requirements",
        "Clean communication: session plans submitted ahead of time when stakeholders require approvals",
      ]}
    />
  );
}
