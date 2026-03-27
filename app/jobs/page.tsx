import type { Metadata } from "next";
import { SITE_URL } from "@/lib/site-url";
import { JOBS_BOARD_OG_IMAGE } from "./metadata";
import { getUnifiedJobBoardFeed } from "@/lib/job-board-feed";
import { JobsStructuredData } from "@/components/jobs/JobsStructuredData";
import { JobsBoardClient } from "./JobsBoardClient";
import { JobsEditorialIntro } from "@/components/jobs/JobsEditorialIntro";

/** Unified feed loads on the server (employer listings + aggregated APIs). */
export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ q?: string }>;
};

/** Search URLs stay crawlable for discovery but consolidate ranking on the canonical /jobs listing. */
export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const { q } = await searchParams;
  const query = typeof q === "string" ? q.trim() : "";
  if (query.length > 0) {
    const short = query.length > 48 ? `${query.slice(0, 45)}…` : query;
    return {
      title: `${short} — job search | Changer Fusions`,
      description: `Job search results for “${short}” on the Changer Fusions board — Kenya roles, remote work, and partner listings.`,
      robots: { index: false, follow: true },
      alternates: { canonical: `${SITE_URL}/jobs` },
      openGraph: {
        url: `${SITE_URL}/jobs`,
        title: `Search: ${short} | Changer Fusions jobs`,
        images: [{ url: JOBS_BOARD_OG_IMAGE, width: 1200, height: 630 }],
      },
      twitter: {
        card: "summary_large_image",
        images: [JOBS_BOARD_OG_IMAGE],
      },
    };
  }
  return {};
}

export default async function JobsPage({ searchParams }: PageProps) {
  const { q } = await searchParams;
  const query = typeof q === "string" ? q : "";
  const { jobs, error } = await getUnifiedJobBoardFeed({ search: query || null });
  const includeJobList = query.trim().length === 0;

  return (
    <>
      <JobsStructuredData jobs={jobs} includeJobList={includeJobList} />
      <JobsBoardClient
        key={query || "__all"}
        initialJobs={jobs}
        initialError={error}
        initialQuery={query}
        intro={query.trim().length === 0 ? <JobsEditorialIntro /> : undefined}
      />
    </>
  );
}
