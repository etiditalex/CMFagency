"use client";

import { Calendar, Users } from "lucide-react";

import { CareerTrackJobsFallback } from "@/components/careers/CareerTrackJobsFallback";
import { useManagedPublicPage } from "@/components/pages/useManagedPublicPage";
import CareerDetailTemplate from "@/components/careers/CareerDetailTemplate";

export default function EventsOpportunitiesPage() {
  const route = "/careers/jobs/events-opportunities";
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
        title={page.title || "Events Job Opportunities"}
        heroLabel={page.hero_label || "EVENTS (JOBS)"}
        description={page.description || "Explore events job opportunities at CMF Agency."}
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
      title="Events and production roles"
      subtitle="Join the team that designs runsheets, coordinates crews, and keeps audiences safe and on schedule."
      intro="Changer Fusions produces corporate launches, awards nights, student engagements, and fashion-forward showcases across Kenya. Events staff work closely with clients, venues, and suppliers—often on tight turnarounds—so we look for people who communicate clearly under pressure and treat guests and talent with equal professionalism."
      icon={Calendar}
      positions={[
        "Event coordinator and project lead",
        "Production assistant and stage liaison",
        "Vendor and logistics coordinator",
        "Registration and guest experience lead",
        "Brand activation and field teams (campaign-dependent)",
      ]}
      requirements={[
        "Demonstrated experience with live events, hospitality, or project coordination",
        "Comfort with evening and weekend work when programmes require it",
        "Strong written and spoken English; Swahili is a plus for coastal and national audiences",
        "Ability to follow safety briefings and venue rules without improvisation that affects insurance",
        "Familiarity with basic run-of-show documents, timelines, or ticketing tools",
      ]}
    />
  );
}
