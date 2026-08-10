import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SITE_URL } from "@/lib/site-url";
import { getExternalJobForSeo, jobSeoDescription } from "@/lib/job-board-server";
import { buildJobPostingJsonLd } from "@/lib/job-posting-jsonld";
import ExternalJobDetailClient from "./ExternalJobDetailClient";

export const revalidate = 300;

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const job = await getExternalJobForSeo(id);
  if (!job) {
    return {
      title: { absolute: "Job not found | Changer Fusions" },
      robots: { index: false, follow: true },
    };
  }

  const pathId = encodeURIComponent(id);
  const url = `${SITE_URL}/jobs/external/${pathId}`;
  const title = `${job.title} at ${job.company_name} | Changer Fusions Jobs`;
  const description = jobSeoDescription(job);

  return {
    title: { absolute: title },
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: "Changer Fusions",
      type: "website",
      locale: "en_KE",
      images: job.poster_url
        ? [{ url: job.poster_url, alt: `${job.title} — ${job.company_name}` }]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: job.poster_url ? [job.poster_url] : undefined,
    },
  };
}

export default async function ExternalJobDetailPage({ params }: PageProps) {
  const { id } = await params;
  const job = await getExternalJobForSeo(id);
  if (!job) notFound();

  const pathId = encodeURIComponent(id);
  const url = `${SITE_URL}/jobs/external/${pathId}`;
  const schemaDescription =
    job.description || job.summary || `${job.title} at ${job.company_name}`;

  const jobPosting = buildJobPostingJsonLd({
    title: job.title,
    description: schemaDescription,
    datePosted: job.posted_at,
    companyName: job.company_name,
    location: job.location,
    employmentType: job.employment_type,
    salaryText: job.salary_text,
    url,
    directApplyUrl: job.apply_url,
    identifier: job.id,
  });

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Jobs", item: `${SITE_URL}/jobs` },
      { "@type": "ListItem", position: 3, name: job.title, item: url },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jobPosting) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <ExternalJobDetailClient job={job} />
    </>
  );
}
