import type { Metadata } from "next";
import LivePollsHero from "@/components/poll/LivePollsHero";
import { SAMPLE_POLLS } from "@/components/poll/live-polls-sample";
import { listFusionPolls } from "@/lib/fusion-polls-server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Live Polls",
  description:
    "Live polls and results from Changer Fusions. Follow politics, brands, events, opinion polls, and campaigns as the votes come in.",
};

export default async function LivePollsPage() {
  const records = await listFusionPolls();
  const polls = records ?? SAMPLE_POLLS;

  return (
    <div className="min-h-screen bg-canvas">
      <LivePollsHero polls={polls} />
    </div>
  );
}
