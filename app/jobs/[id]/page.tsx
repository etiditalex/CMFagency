import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SITE_URL } from "@/lib/site-url";
import { getEmployerJobForSeo, jobSeoDescription } from "@/lib/job-board-server";
import { buildJobPostingJsonLd } from "@/lib/job-posting-jsonld";
import JobDetailClient from "./JobDetailClient";

export const revalidate = 300;

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const listing = await getEmployerJobForSeo(id);
  if (!listing) {
    return {
      title: { absolute: "Job not found | Changer Fusions" },
      robots: { index: false, follow: true },
    };
  }

  const url = `${SITE_URL}/jobs/${listing.id}`;
  const title = `${listing.title} at ${listing.company_name} | Changer Fusions Jobs`;
  const description = jobSeoDescription(listing);

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
      images: listing.poster_url
        ? [{ url: listing.poster_url, alt: `${listing.title} — ${listing.company_name}` }]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: listing.poster_url ? [listing.poster_url] : undefined,
    },
  };
}

export default async function JobDetailPage({ params }: PageProps) {
  const { id } = await params;
  const listing = await getEmployerJobForSeo(id);
  if (!listing) notFound();

  const url = `${SITE_URL}/jobs/${listing.id}`;
  const schemaDescription = listing.locked
    ? listing.summary || listing.description
    : listing.description || listing.summary || `${listing.title} at ${listing.company_name}`;

  const jobPosting = buildJobPostingJsonLd({
    title: listing.title,
    description: schemaDescription,
    datePosted: listing.published_at,
    companyName: listing.company_name,
    location: listing.location,
    employmentType: listing.employment_type,
    salaryText: listing.salary_text,
    url,
    identifier: listing.id,
  });

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Jobs", item: `${SITE_URL}/jobs` },
      { "@type": "ListItem", position: 3, name: listing.title, item: url },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jobPosting) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <JobDetailClient initial={listing} />
    </>
  );
}
