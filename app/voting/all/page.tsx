import AllVotingPageClient from "./AllVotingPageClient";
import { getVotingAllCatalog } from "@/lib/voting-all-catalog";
import { votingEndMsFromSchedule, votingStartMsFromSchedule } from "@/lib/voting-schedule-public";

/** Avoid build-time Supabase work on Vercel (60s prerender timeouts); render on request instead. */
export const dynamic = "force-dynamic";

export default async function AllVotingPage() {
  const result = await getVotingAllCatalog();

  if (!result.ok) {
    return (
      <AllVotingPageClient
        initialCategories={[]}
        initialError={result.error}
        initialVotingLocked={false}
        initialVotingClosed={false}
        votingStartMs={votingStartMsFromSchedule(null)}
        votingEndMs={votingEndMsFromSchedule(null)}
      />
    );
  }

  const votingStartMs = votingStartMsFromSchedule(result.voting_starts_at);
  const votingEndMs = votingEndMsFromSchedule(result.voting_ends_at);
  const now = Date.now();

  return (
    <AllVotingPageClient
      initialCategories={result.categories}
      initialError={null}
      initialVotingLocked={now < votingStartMs}
      initialVotingClosed={now >= votingEndMs}
      votingStartMs={votingStartMs}
      votingEndMs={votingEndMs}
    />
  );
}
