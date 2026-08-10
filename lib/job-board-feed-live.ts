import { unstable_cache } from "next/cache";
import { runAllCollectors } from "@/lib/job-aggregators/collect-all";
import type { CollectedJob } from "@/lib/job-aggregators/types";

/** Shown when DB has no aggregated rows yet; cached to avoid hammering partner APIs on every request. */
export const getLiveCollectedJobsCached = unstable_cache(
  async (): Promise<CollectedJob[]> => {
    const results = await runAllCollectors();
    return results.flatMap((r) => r.jobs);
  },
  ["job-board-live-collected-v1"],
  { revalidate: 900 }
);
