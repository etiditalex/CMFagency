import { notFound } from "next/navigation";
import { Suspense } from "react";

import IndustryDemoFormClient from "@/components/fusion-xpress/visitor-management/IndustryDemoFormClient";
import {
  getIndustryDemo,
  INDUSTRY_DEMO_SLUGS,
} from "@/lib/visitors/industry-demos";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return INDUSTRY_DEMO_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const demo = getIndustryDemo(slug);
  if (!demo) return { title: "Pre-registration | Fusion Xpress" };
  return {
    title: `${demo.title.replace(/Demo\s*$/i, "Pre-registration")} | Fusion Xpress`,
    description: `Pre-register your visit for ${demo.subtitle.replace(/check-in/i, "pre-registration")}.`,
  };
}

export default async function IndustryPreRegisterPage({ params }: PageProps) {
  const { slug } = await params;
  const demo = getIndustryDemo(slug);
  if (!demo) notFound();

  return (
    <Suspense
      fallback={
        <p className="min-h-screen py-16 text-center text-sm text-gray-500">
          Loading pre-registration form…
        </p>
      }
    >
      <IndustryDemoFormClient demo={demo} mode="preregister" />
    </Suspense>
  );
}
