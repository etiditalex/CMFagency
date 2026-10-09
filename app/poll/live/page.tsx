import type { Metadata } from "next";
import LivePollsHero from "@/components/poll/LivePollsHero";
import PollJsonLd from "@/components/poll/PollJsonLd";
import { SAMPLE_POLLS } from "@/components/poll/live-polls-sample";
import { listFusionPolls } from "@/lib/fusion-polls-server";
import { livePollsJsonLd } from "@/lib/poll/poll-jsonld";
import { pollPageMetadata } from "@/lib/poll/poll-metadata";

export const dynamic = "force-dynamic";

export const metadata: Metadata = pollPageMetadata({
  title: "Live Opinion Polls",
  description:
    "Live opinion polls from Changer Fusions Polling Fx. Follow politics, brands, events, and opinion polls and see the vote tally update as people respond.",
  path: "/poll/live",
  keywords: [
    "live opinion polls",
    "Kenya opinion poll",
    "Polling Fx",
    "live poll results Kenya",
    "brand poll",
    "political opinion poll Kenya",
    "event poll results",
  ],
});

export default async function LivePollsPage() {
  const records = await listFusionPolls();
  const polls = records
    ? records.map((record) => record.poll).filter((poll) => poll.topic !== "poll")
    : SAMPLE_POLLS;

  return (
    <div className="min-h-screen overflow-x-clip bg-canvas">
      <PollJsonLd data={livePollsJsonLd(records ? polls : [])} />
      <LivePollsHero polls={polls} />
    </div>
  );
}
