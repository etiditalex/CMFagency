import type { UnifiedJobListing } from "@/lib/job-board-feed";
import { SITE_URL } from "@/lib/site-url";
import { BRAND_LOGO_URL } from "@/lib/brand-logo";

type Props = {
  jobs: UnifiedJobListing[];
  /** Omit ItemList on filtered search pages to avoid duplicate thin signals */
  includeJobList: boolean;
};

function absoluteJobUrl(job: UnifiedJobListing): string {
  if (job.detail_path.startsWith("http://") || job.detail_path.startsWith("https://")) {
    return job.detail_path;
  }
  return `${SITE_URL}${job.detail_path.startsWith("/") ? "" : "/"}${job.detail_path}`;
}

/**
 * JSON-LD for the job board: WebPage, ItemList (top listings), WebSite SearchAction for /jobs?q=
 */
export function JobsStructuredData({ jobs, includeJobList }: Props) {
  const pageUrl = `${SITE_URL}/jobs`;
  const top = includeJobList ? jobs.slice(0, 28) : [];

  const graph: Record<string, unknown>[] = [
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      name: "Changer Fusions",
      alternateName: ["CMF Agency", "Changer Fusions Kenya"],
      url: SITE_URL,
      description:
        "Marketing, events, and digital agency in Kenya. Job board for local and remote roles.",
      publisher: { "@id": `${SITE_URL}/#organization` },
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: `${SITE_URL}/jobs?q={search_term_string}`,
        },
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: "Changer Fusions",
      url: SITE_URL,
      logo: {
        "@type": "ImageObject",
        url: BRAND_LOGO_URL,
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "@id": `${pageUrl}#webpage`,
      url: pageUrl,
      name: "Jobs in Kenya & remote | Changer Fusions job board",
      description:
        "Search jobs in Kenya, remote work, and curated listings. Employers can post roles; candidates apply on-site or via partner listings.",
      isPartOf: { "@id": `${SITE_URL}/#website` },
      about: {
        "@type": "Thing",
        name: "Employment and careers in Kenya",
      },
      inLanguage: "en-KE",
    },
  ];

  if (top.length > 0) {
    graph.push({
      "@context": "https://schema.org",
      "@type": "ItemList",
      "@id": `${pageUrl}#itemlist`,
      name: "Featured job listings",
      numberOfItems: top.length,
      itemListElement: top.map((job, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: `${job.title} — ${job.company_name}`,
        url: absoluteJobUrl(job),
      })),
    });
  }

  const payload = { "@graph": graph };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(payload) }}
    />
  );
}
