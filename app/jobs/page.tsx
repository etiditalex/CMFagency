import { getPublishedJobListings } from "@/lib/job-board-listings";
import { JobsBoardClient } from "./JobsBoardClient";

/** Listings load on the server so refresh/navigation is not blocked by client JS + a second fetch. */
export const dynamic = "force-dynamic";

export default async function JobsPage() {
  const { listings, error } = await getPublishedJobListings();
  return <JobsBoardClient initialListings={listings} initialError={error} />;
}
