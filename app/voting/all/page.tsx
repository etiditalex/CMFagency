import AllVotingPageClient from "./AllVotingPageClient";
import { getVotingAllCatalog } from "@/lib/voting-all-catalog";
import { votingStartMsFromSchedule } from "@/lib/voting-schedule-public";

/** Avoid build-time Supabase work on Vercel (60s prerender timeouts); render on request instead. */
export const dynamic = "force-dynamic";

export default async function AllVotingPage() {
  const result = await getVotingAllCatalog();

  if (!result.ok) {
    const votingStartMs = votingStartMsFromSchedule(null);
    return (
      <AllVotingPageClient
        initialCategories={[]}
        initialError={result.error}
        initialVotingLocked={false}
        votingStartMs={votingStartMs}
      />
    );
  }

  const votingStartMs = votingStartMsFromSchedule(result.voting_starts_at);
  const initialVotingLocked = Date.now() < votingStartMs;

  return (
    <AllVotingPageClient
      initialCategories={result.categories}
      initialError={null}
      initialVotingLocked={initialVotingLocked}
      votingStartMs={votingStartMs}
    />
  );
}
