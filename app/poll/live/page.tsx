import type { Metadata } from "next";
import LivePollsHero from "@/components/poll/LivePollsHero";
import { SAMPLE_POLLS } from "@/components/poll/live-polls-sample";
import { listFusionPolls } from "@/lib/fusion-polls-server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Live Polls",
  description:
    "Live opinion polls and results from Changer Fusions. Follow opinion polls, politics, brands, and events as the votes come in.",
};

export default async function LivePollsPage() {
  const records = await listFusionPolls();
  const polls = records
    ? records.map((record) => record.poll).filter((poll) => poll.topic !== "poll")
    : SAMPLE_POLLS;

  return (
    <div className="min-h-screen bg-canvas">
      <LivePollsHero polls={polls} />
    </div>
  );
}
