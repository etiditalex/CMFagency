import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import IndustryDemoForm from "@/components/fusion-xpress/visitor-management/IndustryDemoForm";
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
    <div className="min-h-screen overflow-x-hidden bg-white">
      <div className="w-full px-4 pb-16 pt-32 sm:px-6 sm:pt-36 md:pt-40 lg:px-10">
        <div className="mx-auto max-w-lg">
          <nav aria-label="Breadcrumb" className="mb-6">
            <Link
              href="/fusion-xpress/smart-visitor-management"
              className="inline-flex items-center gap-2 py-1.5 text-sm font-semibold leading-normal text-primary-600 hover:text-primary-800"
            >
              <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
              <span>Smart Visitor Management</span>
            </Link>
          </nav>

          <header className="text-center">
            <h1 className="text-2xl font-extrabold leading-tight tracking-tight text-gray-900 md:text-3xl">
              {demo.title}
            </h1>
            <p className="mt-2 text-base leading-relaxed text-gray-500">{demo.subtitle}</p>
          </header>

          <div className="mt-10">
            <IndustryDemoForm demo={demo} />
          </div>
        </div>
      </div>
    </div>
  );
}
