"use client";

import Link from "next/link";
import { Sparkles, Users } from "lucide-react";

import { CareerTrackJobsFallback } from "@/components/careers/CareerTrackJobsFallback";
import { useManagedPublicPage } from "@/components/pages/useManagedPublicPage";
import CareerDetailTemplate from "@/components/careers/CareerDetailTemplate";

export default function FashionOpportunitiesPage() {
  const route = "/careers/jobs/fashion-opportunities";
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
        title={page.title || "Fashion Job Opportunities"}
        heroLabel={page.hero_label || "FASHION (JOBS)"}
        description={page.description || "Explore fashion job opportunities at CMF Agency."}
        featuresTitle={page.features_title || "FEATURES"}
        features={(Array.isArray(page.features) ? page.features : []).map((x) => String(x))}
        benefitsTitle={page.benefits_title || "BENEFITS"}
        benefits={(Array.isArray(page.benefits) ? page.benefits : []).map((x) => String(x))}
        ctaTitle={page.cta_title || "Get Started"}
        ctaDescription={page.cta_description || "Contact us for more information about fashion roles."}
        icon={Users}
      />
    );
  }

  return (
    <CareerTrackJobsFallback
      backHref="/careers/jobs"
      backLabel="Back to Jobs"
      title="Fashion and creative production roles"
      subtitle="Support runway, editorial, and brand campaigns where craft and professionalism matter."
      intro="Our fashion work spans auditions, Coast Fashion and Modelling Awards programmes, and commercial shoots for clients who need disciplined creative partners. These roles pair aesthetic judgment with logistics: call times, fittings, and clear communication between designers, models, and clients."
      icon={Sparkles}
      positions={[
        "Fashion show producer or assistant producer",
        "Wardrobe and styling assistant",
        "Casting coordinator (often overlaps with our talent desk)",
        "Content and backstage documentation lead",
        "Creative operations and vendor liaison for shoots",
      ]}
      requirements={[
        "Portfolio, references, or credits from fashion, film, or commercial production",
        "Respect for model safety, minors’ safeguarding policies, and venue codes of conduct",
        "Comfort with early calls, travel within the coast or Nairobi when briefs require it",
        "Strong organization for look lists, schedules, and measurement or size charts",
        "Baseline skill with common creative tools (scheduling apps, shared drives, basic photo/video handoff)",
      ]}
      extraNote={
        <p>
          Casting-only or representation enquiries sometimes belong on our{" "}
          <Link href="/talent" className="font-semibold text-accent-600 underline hover:text-accent-700">
            talent
          </Link>{" "}
          track rather than salaried job search—read both pages before you apply so your note lands with the right team.
        </p>
      }
    />
  );
}
