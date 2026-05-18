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
  if (!demo) return { title: "Demo Form | Fusion Xpress" };
  return {
    title: `${demo.title} | Fusion Xpress`,
    description: `Preview the ${demo.subtitle} for Fusion Xpress Smart Visitor Management.`,
  };
}

export default async function IndustryDemoFormPage({ params }: PageProps) {
  const { slug } = await params;
  const demo = getIndustryDemo(slug);
  if (!demo) notFound();

  return (
    <Suspense
      fallback={
        <p className="min-h-screen py-16 text-center text-sm text-gray-500">
          Loading check-in form…
        </p>
      }
    >
      <IndustryDemoFormClient demo={demo} />
    </Suspense>
  );
}
