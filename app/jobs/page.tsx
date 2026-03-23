import { getUnifiedJobBoardFeed } from "@/lib/job-board-feed";
import { JobsBoardClient } from "./JobsBoardClient";

/** Unified feed loads on the server (employer listings + aggregated APIs). */
export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ q?: string }>;
};

export default async function JobsPage({ searchParams }: PageProps) {
  const { q } = await searchParams;
  const query = typeof q === "string" ? q : "";
  const { jobs, error } = await getUnifiedJobBoardFeed({ search: query || null });
  return (
    <JobsBoardClient key={query || "__all"} initialJobs={jobs} initialError={error} initialQuery={query} />
  );
}
